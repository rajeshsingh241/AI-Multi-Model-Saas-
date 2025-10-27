"use client";

import React, { useState, useEffect } from "react";
import { DefaultModel } from "@/shared/AiModelsShared";
import { updateDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AppSidebar } from "./_components/AppSidebar";
import { AppHeader } from "./_components/AppHeader";
import { db } from "@/config/FirebaseConfig";
import { useUser } from "@clerk/nextjs";
import { AiSelectModelContext } from "@/context/AiSelectedModelContext";
import { UserDetailContext } from "@/context/UserDetailContext";
import AiModelList from "@/shared/AiModelList";

function Provider({ children, ...props }) {
  const { user } = useUser();
  
  //   proper initial state for aiSelectedModels
  const [aiSelectedModels, setAiSelectedModels] = useState(() => {
    const initialModels = {};
    AiModelList.forEach(model => {
      initialModels[model.model] = {
        enable: true, // All models enabled by default
        modelId: DefaultModel[model.model]?.modelId || ""
      };
    });
    console.log("🔄 Initialized aiSelectedModels:", initialModels);
    return initialModels;
  });
  
  const [userDetail, setUserDetail] = useState();
  const [messages, setMessages] = useState({});

  // Create or fetch user on mount
  useEffect(() => {
    if (user) {
      CreateNewUser();
    }
  }, [user]);

  // Update AI model selection when it changes
  useEffect(() => {
    if (aiSelectedModels && user) {
      updateAIModelSelectionpref();
    }
  }, [aiSelectedModels, user]);

  //  generate safe user ID
  const getSafeUserId = () => {
    const emailId = user?.primaryEmailAddress?.emailAddress;
    if (emailId) return emailId.replace(/\./g, "_").replace(/@/g, "_");
    return user?.id || null;
  };

  // Update AI model selection in Firestore
  const updateAIModelSelectionpref = async () => {
    try {
      const userId = getSafeUserId();
      if (!userId) return;

      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, { selectModelpref: aiSelectedModels });
        console.log("AI model selection updated for user:", userId);
      } else {
        await setDoc(docRef, { selectModelpref: aiSelectedModels }, { merge: true });
        console.log("Created AI model selection for new user:", userId);
      }
    } catch (err) {
      console.error("Error updating AI model selection:", err);
    }
  };

  // Create new user in Firestore if not exists
  const CreateNewUser = async () => {
    try {
      const userId = getSafeUserId();
      if (!userId) {
        console.error("No valid ID for user. Skipping creation.");
        return;
      }

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userInfo = userSnap.data();
        // Use the saved preferences or fall back to properly initialized state
        if (userInfo?.selectModelpref) {
          setAiSelectedModels(userInfo.selectModelpref);
        } else {
          // Initialize with proper structure if no preferences saved
          const initialModels = {};
          AiModelList.forEach(model => {
            initialModels[model.model] = {
              enable: true,
              modelId: DefaultModel[model.model]?.modelId || ""
            };
          });
          setAiSelectedModels(initialModels);
        }
        setUserDetail(userInfo);
        console.log("User already exists:", userId);
        return;
      }

      const newUserData = {
        name: user?.fullName || "Unknown",
        email: user?.primaryEmailAddress?.emailAddress || "",
        createdAt: new Date(),
        remainingMsg: 5,
        plan: "free",
        credits: 1000,
        selectModelpref: aiSelectedModels, // Use the properly initialized state
      };

      await setDoc(userRef, newUserData);
      setUserDetail(newUserData);
      console.log("New user created successfully:", userId);
    } catch (err) {
      console.error("Error creating new user:", err);
    }
  };

  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
        <AiSelectModelContext.Provider value={{ aiSelectedModels, setAiSelectedModels, messages, setMessages }}>
          <SidebarProvider>
            <AppSidebar />
            <div className="w-full">
              <AppHeader />
              {children}
            </div>
          </SidebarProvider>
        </AiSelectModelContext.Provider>
      </UserDetailContext.Provider>
    </NextThemesProvider>
  );
}

export default Provider;