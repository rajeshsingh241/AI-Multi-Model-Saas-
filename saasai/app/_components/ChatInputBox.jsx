"use client";

import React, { useState, useContext, useEffect } from "react";
import { Paperclip, Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiSelectModelContext } from "@/context/AiSelectedModelContext";
import axios from "axios";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { db } from "@/config/FirebaseConfig";
import { v4 as uuidv4 } from "uuid";
import AiMultiModels from "./AiMultiModels";
import { useSearchParams } from "next/navigation";
import { DefaultModel } from "@/shared/AiModelsShared";
import { useAuth } from "@clerk/nextjs";

function ChatInputBox() {
  const [userInput, setUserInput] = useState("");
  const { user } = useUser();
  const { aiSelectedModels, messages, setMessages } = useContext(AiSelectModelContext);
  const [chatId, setChatId] = useState();
  const params = useSearchParams();
const {has} = useAuth();

  // Initialize chatId
  useEffect(() => {
    const idFromParams = params.get("chatId");
    setChatId(idFromParams || uuidv4());
  }, [params]);

  // Fetch messages from Firestore whenever chatId is set
  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      const docRef = doc(db, "chatHistory", chatId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || {});
      } else {
        // Initialize empty messages for all enabled models
        const initialMessages = {};
        Object.keys(aiSelectedModels).forEach((key) => {
          if (aiSelectedModels[key]?.enable) initialMessages[key] = [];
        });
        setMessages(initialMessages);
      }
    };

    fetchMessages();
  }, [chatId]);

  // Auto-save messages to Firestore
  useEffect(() => {
    if (!chatId || !user || !messages) return;

    const saveMessages = async () => {
      const docRef = doc(db, "chatHistory", chatId);
      await setDoc(docRef, {
        chatId,
        userEmail: user.primaryEmailAddress?.emailAddress || "anonymous",
        messages,
        lastUpdated: Date.now(),
      });
    };

    saveMessages();
  }, [messages, chatId, user]);

  // Handle sending user message
  const handleSend = async () => {
   


    if (!userInput.trim()) return;

    const currentInput = userInput;
    setUserInput("");

    // Add user message immediately to UI
    setMessages((prev) => {
      const updated = { ...prev };
      Object.keys(aiSelectedModels).forEach((modelKey) => {
        if (aiSelectedModels[modelKey]?.enable) {
          updated[modelKey] = [...(updated[modelKey] ?? []), { role: "user", content: currentInput }];
        }
      });
      return updated;
    });

    // Deduct token for free plan
    try {
      const result = await axios.post("/api/user-remaining-msg", { token: 1 });
      const remainingToken = result?.data?.remainingToken;
      if (remainingToken <= 0) {
        toast.error("Maximum Daily Limit Exceeded");
        return;
      }
    } catch (err) {
      console.error("Error checking remaining messages:", err);
      toast.error("Error checking message limit");
      return;
    }

    // Send message to all enabled AI models
  const requests = Object.entries(aiSelectedModels)
  .filter(([parentModel, modelInfo]) => {
    const modelId = modelInfo.modelId || DefaultModel[parentModel]?.modelId;
    if (!modelInfo.enable || !modelId) {
      console.warn(`Skipping ${parentModel} due to missing modelId`);
      return false;
    }
    return true;
  })
  .map(async ([parentModel, modelInfo]) => {
    // Use the safe DefaultModel if modelId missing
    const modelId = modelInfo.modelId || DefaultModel[parentModel]?.modelId;
    console.log("Sending AI model ID:", modelId);

    setMessages((prev) => ({
      ...prev,
      [parentModel]: [
        ...(prev[parentModel] ?? []),
        { role: "assistant", content: "Loading...", model: parentModel, loading: true },
      ],
    }));

    try {
      const result = await axios.post("/api/ai-multi-model", {
        model: modelId, // guaranteed valid now
        msg: [{ role: "user", content: currentInput }],
        parentModel,
      });

      const { aiResponse, model } = result.data;

      setMessages((prev) => {
        const updated = [...(prev[parentModel] ?? [])];
        const loadingIndex = updated.findIndex((m) => m.loading);
        if (loadingIndex !== -1) {
          updated[loadingIndex] = { role: "assistant", content: aiResponse, model, loading: false };
        } else {
          updated.push({ role: "assistant", content: aiResponse, model, loading: false });
        }
        return { ...prev, [parentModel]: updated };
      });
    } catch (err) {
      console.error(`Error from ${parentModel}:`, err);
      setMessages((prev) => ({
        ...prev,
        [parentModel]: [
          ...(prev[parentModel] ?? []),
          { role: "assistant", content: "Error fetching response from model.", model: parentModel },
        ],
      }));
    }
  });


    await Promise.all(requests);
  };

  return (
    <div className="relative min-h-screen">
      <div>
        <AiMultiModels />
      </div>

      <div className="fixed bottom-0 left-0 flex w-full justify-center bg-background/70 backdrop-blur-md border-t border-gray-200">
        <div className="w-full max-w-2xl p-4">
          <div className="border rounded-xl shadow-md p-4 bg-white dark:bg-gray-900">
            <input
              type="text"
              placeholder="Ask me anything..."
              className="border-0 outline-none w-full p-3 bg-transparent text-gray-800 dark:text-gray-200"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            <div className="mt-3 flex justify-between items-center">
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>

              <div className="flex space-x-2">
                <Button variant="ghost" size="icon">
                  <Mic />
                </Button>
                <Button size="icon" className="bg-blue-500 text-white hover:bg-blue-600" onClick={handleSend}>
                  <Send />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInputBox;
