import { Clerk, useOAuth, useSignUp } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";

// Shared sign-up logic
export function useSignUpLogic() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [loading, setLoading] = useState(false);

  // Send sign-up request and trigger email verification
  const signUpWithEmail = async ({ email, password }: { email: string; password: string }) => {
    if (!isLoaded) throw new Error("Clerk not loaded");
    setLoading(true);
    try {
      // Create the sign-up
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      return { success: true, signUp: result };
    } catch (err: any) {
      console.error("Sign up error:", err);
      const errorMessage = err?.errors?.[0]?.longMessage || err?.message || "An error occurred. Please try again.";
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { signUpWithEmail, loading, signUp, setActive };
}

// Shared OTP verification logic
export function useOtpVerificationLogic() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [isVerifying, setIsVerifying] = useState(false);

  // Verify OTP and create user in backend
  const verifyOtp = async ({ code, name, email, phone, createUser }: { code: string; name: string; email: string; phone?: string; createUser: (params: { name: string; email: string; clerkId: string; phone?: string; profileImageUrl?: string }) => Promise<any> }) => {
    if (!isLoaded || !signUp) throw new Error("Clerk not loaded or sign up not initiated");

    setIsVerifying(true);
    try {
      // Attempt to verify the email
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      console.log("Verification result:", completeSignUp.status);

      if (completeSignUp.status === "complete") {
        // Create user in your backend
        await createUser({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          clerkId: completeSignUp.createdUserId!,
          phone: phone?.trim(),
        });

        // Set the active session
        if (completeSignUp.createdSessionId) {
          await setActive({ session: completeSignUp.createdSessionId });
        }

        return { success: true };
      } else if (completeSignUp.status === "missing_requirements") {
        throw new Error("Additional verification required");
      } else {
        throw new Error("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);

      // Clear token on OTP failure
      await tokenCache.deleteToken("__clerk_token_cache");

      // Handle specific error cases
      if (err?.errors?.[0]?.code === "form_code_incorrect") {
        throw new Error("Invalid verification code. Please check and try again.");
      } else if (err?.errors?.[0]?.code === "verification_expired") {
        throw new Error("Verification code expired. Please request a new one.");
      } else if (err?.errors?.[0]?.code === "verification_failed") {
        throw new Error("Verification failed. Please request a new code.");
      }

      const errorMessage = err?.errors?.[0]?.longMessage || err?.message || "Verification failed. Please try again.";
      throw new Error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP code
  const resendOtp = async () => {
    if (!isLoaded || !signUp) throw new Error("Clerk not loaded or sign up not initiated");

    try {
      // Check if verification is still possible
      if (signUp.status === "complete") {
        throw new Error("Account already verified. Please sign in.");
      }

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      return { success: true };
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      const errorMessage = err?.errors?.[0]?.longMessage || err?.message || "Failed to resend code. Please try again.";
      throw new Error(errorMessage);
    }
  };

  return { verifyOtp, resendOtp, isVerifying };
}

// Google OAuth logic
export function useGoogleAuth() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async (createUser: (params: { name: string; email: string; clerkId: string; phone?: string; profileImageUrl?: string }) => Promise<any>) => {
    setLoading(true);
    try {
      // Always prompt for account selection
      const { createdSessionId, setActive, signUp, signIn } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/options"),
        // Pass prompt param to Google OAuth
        oauthParams: { prompt: "select_account" },
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        // New user registration
        if (signUp?.createdUserId) {
          const userData = {
            name: `${signUp.firstName || ""} ${signUp.lastName || ""}`.trim() || "Google User",
            email: signUp.emailAddress || "",
            clerkId: signUp.createdUserId,
          };
          await createUser(userData);
        }
        // Existing user sign in
        // ...no-op, just session set above...

        return {
          success: true,
          code: "success",
          message: "Successfully signed in with Google",
        };
      }

      // If authentication is incomplete, sign out and clear token
      await Clerk.signOut();
      await tokenCache.deleteToken("__clerk_token_cache");

      return {
        success: false,
        message: "Authentication incomplete. Please try again.",
      };
    } catch (err: any) {
      console.error("Google OAuth error:", err);

      // On error, sign out and clear token
      await Clerk.signOut();
      await tokenCache.deleteToken("__clerk_token_cache");

      return {
        success: false,
        code: err?.code,
        message: err?.errors?.[0]?.longMessage || "Failed to sign in with Google",
      };
    } finally {
      setLoading(false);
    }
  };

  return { signInWithGoogle, loading };
}

// Token cache for Clerk
export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐`);
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
      console.error("SecureStore save item error: ", err);
      return;
    }
  },
  async deleteToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log(`Token under key ${key} deleted`);
    } catch (err) {
      console.error("SecureStore delete item error: ", err);
    }
  },
};

