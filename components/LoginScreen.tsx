import React, { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID } from "../services/google.ts";

interface LoginScreenProps {
  onLogin: (response: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const signInButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // --- DEBUGGING: Log the exact origin for Google OAuth setup ---
    // AI Studio runs apps in an iframe with a unique origin.
    // Copy the URL logged below and add it to your "Authorized JavaScript origins"
    // in the Google Cloud Console to fix the 'origin_mismatch' error.
    console.log("Current Origin for Google Sign-In:", window.location.origin);
    // --- END DEBUGGING ---

    // Check if the google object is available
    if (window.google && signInButtonRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onLogin,
      });

      window.google.accounts.id.renderButton(signInButtonRef.current, {
        theme: "filled_black",
        size: "large",
        type: "standard",
        text: "signin_with",
      });

      // Also display the One Tap prompt
      window.google.accounts.id.prompt();
    } else {
      console.error("Google Identity Services script not loaded yet.");
    }
  }, [onLogin]);

  return (
    <div className="min-h-screen bg-brand-primary flex flex-col justify-center items-center text-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-5xl font-bold font-display text-white mb-4">
          LifeQuest
        </h1>
        <p className="text-lg text-brand-text-secondary mb-12">
          Turn your daily tasks and habits into an exciting adventure.
        </p>

        {!GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID") ? (
          <div ref={signInButtonRef} className="flex justify-center"></div>
        ) : (
          <div
            className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md"
            role="alert"
          >
            <p className="font-bold">Configuration Needed</p>
            <p>
              Please update `services/google.ts` with your Google Client ID to
              enable Sign-In.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
