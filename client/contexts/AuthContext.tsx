import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth, db, firebaseAvailable } from "../lib/firebase";
// Firestore functions imported dynamically when needed to avoid unnecessary network activity on module load

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  booqableCustomerId?: string;
  preferences?: {
    notifications: boolean;
    newsletter: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn(
      "useAuth called outside AuthProvider, returning fallback object",
    );
    // Provide a safe fallback to avoid runtime crashes when provider is missing
    const fallback = {
      currentUser: null,
      userProfile: null,
      loading: true,
      login: async (_email?: string, _password?: string) => {
        throw new Error(
          "Authentication is not available. Please contact support.",
        );
      },
      register: async (
        _email?: string,
        _password?: string,
        _displayName?: string,
      ) => {
        throw new Error(
          "Authentication is not available. Please contact support.",
        );
      },
      loginWithGoogle: async () => {
        throw new Error(
          "Authentication is not available. Please contact support.",
        );
      },
      logout: async () => {},
      resetPassword: async (_email?: string) => {
        throw new Error(
          "Authentication is not available. Please contact support.",
        );
      },
      updateUserPassword: async (
        _currentPassword?: string,
        _newPassword?: string,
      ) => {
        throw new Error(
          "Authentication is not available. Please contact support.",
        );
      },
      updateUserProfile: async (_updates?: any) => {
        throw new Error(
          "Authentication is not available. Please contact support.",
        );
      },
      refreshUserProfile: async () => {},
    } as any;
    return fallback;
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Create or update user profile in Firestore
  const createUserProfile = async (
    user: User,
    additionalData: Partial<UserProfile> = {},
  ) => {
    if (!firebaseAvailable) {
      console.warn("Firebase not available, skipping user profile creation");
      return;
    }

    let userSnap: any = null;
    let userRef: any = null;

    try {
      const firestore = await import("firebase/firestore");
      const { doc, getDoc } = firestore;
      userRef = doc(db, "users", user.uid);
      userSnap = await getDoc(userRef);
    } catch (err) {
      console.error(
        "Firestore unavailable when fetching user profile, continuing without persistence:",
        err,
      );
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || additionalData.displayName || "",
        photoURL: user.photoURL || "",
        preferences: { notifications: true, newsletter: false },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...additionalData,
      };
      setUserProfile(fallbackProfile);
      return;
    }

    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user;
      const createdAt = new Date();

      const newProfile: UserProfile = {
        uid: user.uid,
        email: email!,
        displayName: displayName || "",
        photoURL: photoURL || "",
        preferences: {
          notifications: true,
          newsletter: false,
        },
        createdAt,
        updatedAt: createdAt,
        ...additionalData,
      };

      try {
        // Get Firebase ID token for authenticated API calls
        const idToken = await user.getIdToken();

        // Create customer in Booqable
        const customerResponse = await fetch("/api/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            firebase_uid: user.uid,
            email: email!,
            name: displayName || email!.split("@")[0],
          }),
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          newProfile.booqableCustomerId = customerData.data.id;
        } else {
          console.error(
            "Failed to create Booqable customer:",
            await customerResponse.text(),
          );
        }

        // Save profile to Firestore (lazy import)
        try {
          const firestore = await import("firebase/firestore");
          const { setDoc, doc } = firestore;
          await setDoc(userRef, newProfile);
          // Initialize preferences document
          try {
            const prefsRef = doc(
              db,
              "users",
              user.uid,
              "preferences",
              "default",
            );
            await setDoc(
              prefsRef,
              {
                theme: "light",
                notifications: true,
                defaultView: "orders",
                lastLogin: new Date(),
              },
              { merge: true },
            );
          } catch {}
        } catch (e) {
          console.warn("Failed to persist user profile to Firestore:", e);
        }
        setUserProfile(newProfile);
      } catch (error) {
        console.error("Error creating user profile:", error);
        // Still save the profile even if Booqable creation failed
        try {
          const firestore = await import("firebase/firestore");
          const { setDoc } = firestore;
          await setDoc(userRef, newProfile);
        } catch (e) {
          console.warn(
            "Failed to persist new profile to Firestore after Booqable failure:",
            e,
          );
        }
        setUserProfile(newProfile);
      }
    } else {
      const existingProfile = userSnap.data() as UserProfile;
      setUserProfile(existingProfile);

      // Ensure preferences doc exists
      try {
        const firestore = await import("firebase/firestore");
        const { doc, setDoc } = firestore;
        const prefsRef = doc(db, "users", user.uid, "preferences", "default");
        await setDoc(prefsRef, { lastLogin: new Date() }, { merge: true });
      } catch {}

      // If no Booqable customer ID, try to create one
      if (!existingProfile.booqableCustomerId) {
        try {
          const idToken = await user.getIdToken();
          const customerResponse = await fetch("/api/customers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              firebase_uid: user.uid,
              email: user.email!,
              name: existingProfile.displayName || user.email!.split("@")[0],
            }),
          });

          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            await updateUserProfile({
              booqableCustomerId: customerData.data.id,
            });
          }
        } catch (error) {
          console.error(
            "Error creating Booqable customer for existing user:",
            error,
          );
        }
      }
    }
  };

  // Refresh user profile from Firestore
  const refreshUserProfile = async () => {
    if (!firebaseAvailable || !currentUser) {
      return;
    }

    try {
      const firestore = await import("firebase/firestore");
      const { doc, getDoc } = firestore;
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUserProfile(userSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    }
  };

  // Register with email and password
  const register = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    if (!firebaseAvailable) {
      throw new Error(
        "Authentication is not available. Please contact support.",
      );
    }

    try {
      console.log("Attempting to create user with email:", email);
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("User created successfully:", user.uid);

      await updateProfile(user, { displayName });
      console.log("Profile updated with display name");

      await createUserProfile(user, { displayName });
      console.log("User profile created");
    } catch (error: any) {
      console.error("Registration error details:", error);

      // Provide helpful error messages for common domain authorization issues
      if (error.code === "auth/network-request-failed") {
        throw new Error(
          "Domain not authorized. Please contact support to add this domain to Firebase Auth settings.",
        );
      } else if (error.code === "auth/invalid-api-key") {
        throw new Error(
          "Firebase configuration error. Please contact support.",
        );
      }

      throw error;
    }
  };

  // Login with email and password
  const login = async (email: string, password: string) => {
    if (!firebaseAvailable) {
      throw new Error(
        "Authentication is not available. Please contact support.",
      );
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Login with Google
  const loginWithGoogle = async () => {
    if (!firebaseAvailable) {
      throw new Error(
        "Authentication is not available. Please contact support.",
      );
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    const { user } = await signInWithPopup(auth, provider);
    await createUserProfile(user);
  };

  // Logout
  const logout = async () => {
    if (!firebaseAvailable) {
      setCurrentUser(null);
      setUserProfile(null);
      return;
    }

    await signOut(auth);
    setUserProfile(null);
  };

  // Reset password
  const resetPassword = async (email: string) => {
    if (!firebaseAvailable) {
      throw new Error(
        "Authentication is not available. Please contact support.",
      );
    }
    await sendPasswordResetEmail(auth, email);
  };

  // Update password
  const updateUserPassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    if (!firebaseAvailable) {
      throw new Error(
        "Authentication is not available. Please contact support.",
      );
    }

    if (!currentUser || !currentUser.email) {
      throw new Error("No user logged in");
    }

    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword,
    );
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!firebaseAvailable) {
      throw new Error(
        "Profile updates are not available. Please contact support.",
      );
    }

    if (!currentUser) {
      throw new Error("No user logged in");
    }

    try {
      const updatedProfile = {
        ...updates,
        updatedAt: new Date(),
      };

      // Persist updates to Firestore (gracefully degrade if offline)
      try {
        const firestore = await import("firebase/firestore");
        const { doc, setDoc } = firestore;
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, updatedProfile, { merge: true });
      } catch (e) {
        console.warn("Firestore unavailable, storing profile in memory only");
        setUserProfile((prev) => ({
          ...(prev ||
            ({ uid: currentUser.uid, email: currentUser.email || "" } as any)),
          ...updatedProfile,
        }));
      }

      // Update Firebase Auth profile if display name or photo URL changed
      if (updates.displayName !== undefined || updates.photoURL !== undefined) {
        try {
          await updateProfile(currentUser, {
            displayName: updates.displayName,
            photoURL: updates.photoURL,
          });
        } catch {}
      }

      // Sync core fields to Booqable (name, phone, address)
      try {
        const idToken = await currentUser.getIdToken();
        const payload: any = {
          name: updates.displayName,
          phone: updates.phone,
          address: updates.address
            ? {
                line1: updates.address.line1,
                line2: updates.address.line2,
                city: updates.address.city,
                postcode: updates.address.postcode,
                country: updates.address.country,
              }
            : undefined,
        };
        await fetch("/api/dashboard/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.warn("Failed to sync profile to Booqable:", e);
      }

      await refreshUserProfile();
    } catch (error) {
      console.error("Error updating user profile:", error);
      // Do not throw to avoid surfacing to UI when offline
    }
  };

  // Monitor auth state changes
  useEffect(() => {
    let mounted = true;

    if (!firebaseAvailable) {
      console.log("Firebase not available, skipping auth state monitoring");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      try {
        setCurrentUser(user);

        if (user) {
          await createUserProfile(user);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        // Don't break the app, just log the error
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserPassword,
    updateUserProfile,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
