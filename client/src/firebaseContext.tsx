// @ts-nocheck
import React, { useCallback } from "react";

interface IProfile {
  color: string;
  timestamp: Date;
  key: string;
  username: string;
}
export interface IFirebaseContext {
  getProfileFB: (key: string) => Promise<IFetchResponseBase>;
  setProfileFB: (profile: IProfile) => Promise<IFetchResponseBase>;

  getAllProfilesFB: () => Promise<IFetchResponseBase>;
}

export const FirebaseContext = React.createContext<IFirebaseContext>({
  getProfileFB: () => Promise.resolve({ isSuccessful: false }),
  setProfileFB: () => Promise.resolve({ isSuccessful: false }),
  getAllProfilesFB: () => Promise.resolve({ isSuccessful: false }),
});

const fetchBase =
  process.env.NODE_ENV === "development"
    ? ""
    : "https://network-3-ff.onrender.com";

export const FirebaseProvider: React.FC = ({ children }) => {
  const getProfileFB = useCallback(
    async (key: string): Promise<IFetchResponseBase> => {
      const fetchRes = await fetch(fetchBase + `/users/profile/${key}`, {
        method: "GET",
      });

      if (fetchRes.ok) {
        return await fetchRes.json();
      }
    },
    []
  );

  const setProfileFB = useCallback(
    async (profile: IProfile): Promise<IFetchResponseBase> => {
      const fetchRes = await fetch(fetchBase + `/users/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: profile }),
      });

      if (fetchRes.ok) {
        return { isSuccessful: true };
      }

      return { isSuccessful: false, message: fetchRes.statusText };
    },
    []
  );

  const getAllProfilesFB =
    useCallback(async (): Promise<IFetchResponseBase> => {
      const fetchRes = await fetch(fetchBase + `/users/allProfiles`, {
        method: "GET",
      });

      if (fetchRes.ok) {
        return await fetchRes.json();
      }
    }, []);

  return (
    <FirebaseContext.Provider
      value={{
        getProfileFB,
        setProfileFB,
        getAllProfilesFB,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};
