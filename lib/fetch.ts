import { useCallback, useEffect, useState } from "react";

export const fetchAPI = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);

    // First check if the response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if the response has content and is JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      // If it's not JSON, return the text (might be an error page)
      const text = await response.text();
      console.error("Non-JSON response:", text);
      throw new Error(`Expected JSON response but got: ${contentType || "unknown content type"}`);
    }
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      // Check if the result has a data property, otherwise use the result directly
      setData(result.data || result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
