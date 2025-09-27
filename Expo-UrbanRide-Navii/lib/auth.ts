import { useSignUp } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { fetchAPI } from "./fetch";

// Shared sign-up logic
export function useSignUpLogic() {
  const { isLoaded, signUp } = useSignUp();
  const [loading, setLoading] = useState(false);

  // Send sign-up request and trigger email verification
  const signUpWithEmail = async ({ email, password }: { email: string; password: string }) => {
    if (!isLoaded) throw new Error("Clerk not loaded");
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      return { success: true };
    } catch (err: any) {
      const errorMessage = err?.errors?.[0]?.longMessage || "An error occurred. Please try again.";
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { signUpWithEmail, loading };
}

// Shared OTP verification logic
export function useOtpVerificationLogic() {
  const { signUp, setActive } = useSignUp();
  const [isVerifying, setIsVerifying] = useState(false);

  // Verify OTP and create user in backend
  const verifyOtp = async ({ code, name, email, phone, createUser }: { code: string; name: string; email: string; phone?: string; createUser: (params: { name: string; email: string; clerkId: string; phone?: string }) => Promise<any> }) => {
    if (!signUp) throw new Error("Clerk not loaded");
    setIsVerifying(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status === "complete") {
        await createUser({
          name,
          email,
          clerkId: completeSignUp.createdUserId ?? "",
          phone,
        });
        await setActive({ session: completeSignUp.createdSessionId });
        return { success: true };
      } else {
        throw new Error("Verification failed. Please try again.");
      }
    } catch (err: any) {
      const errorMessage = err?.errors?.[0]?.longMessage || err?.response?.data?.error || "Verification failed. Please try again.";
      throw new Error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP code
  const resendOtp = async () => {
    if (!signUp) throw new Error("Clerk not loaded");
    try {
      if (signUp.status === "complete") throw new Error("Account already verified. Please sign in.");
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      return { success: true };
    } catch (err: any) {
      const errorMessage = err?.errors?.[0]?.longMessage || err?.message || "Failed to resend code. Please try again.";
      throw new Error(errorMessage);
    }
  };

  return { verifyOtp, resendOtp, isVerifying };
}


export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any) => {
  try {
    const { createdSessionId, setActive, signUp } = await startOAuthFlow({
      redirectUrl: Linking.createURL("/(root)/(tabs)/home"),
    });

    if (createdSessionId) {
      if (setActive) {
        await setActive({ session: createdSessionId });

        if (signUp.createdUserId) {
          await fetchAPI("/(api)/user", {
            method: "POST",
            body: JSON.stringify({
              name: `${signUp.firstName} ${signUp.lastName}`,
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
            }),
          });
        }

        return {
          success: true,
          code: "success",
          message: "You have successfully signed in with Google",
        };
      }
    }

    return {
      success: false,
      message: "An error occurred while signing in with Google",
    };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      code: err.code,
      message: err?.errors[0]?.longMessage,
    };
  }
};
