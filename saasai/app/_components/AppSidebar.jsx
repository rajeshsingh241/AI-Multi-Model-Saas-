"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sun, Moon, User2, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import axios from "axios";
import moment from "moment";
import Link from "next/link";
import { collection, getDocs, where, query } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";
import { UsageCreditProgress } from "./UsageCreditProgress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import PricingModal from "./PricingModal";

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const router = useRouter();

  const [chatHistory, setChatHistory] = useState([]);
  const [freeMsgCount, setFreeMsgCount] = useState(0);

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      GetChatHistory();
      GetRemainingMsgs();
    }
  }, [user]);

  const GetChatHistory = async () => {
    try {
      const q = query(
        collection(db, "chatHistory"),
        where("userEmail", "==", user?.primaryEmailAddress?.emailAddress)
      );
      const querySnapshot = await getDocs(q);
      const chats = [];
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        chats.push({
          id: doc.id,
          ...chatData
        });
      });
      
      
      chats.sort((a, b) => {
        const getTimestamp = (chat) => {
          if (!chat.lastUpdated) return 0;
          if (chat.lastUpdated.toDate && typeof chat.lastUpdated.toDate === 'function') {
            return chat.lastUpdated.toDate().getTime();
          }
          if (chat.lastUpdated instanceof Date) {
            return chat.lastUpdated.getTime();
          }
          if (typeof chat.lastUpdated === 'number') {
            return chat.lastUpdated;
          }
          if (typeof chat.lastUpdated === 'string') {
            return new Date(chat.lastUpdated).getTime();
          }
          return 0;
        };
        
        return getTimestamp(b) - getTimestamp(a);
      });
      
      setChatHistory(chats);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };

  const GetLastUserMessageFromChat = (chat) => {
    try {
      if (!chat?.messages) return null;

      let allMessages = [];
      Object.values(chat.messages).forEach(modelMessages => {
        if (Array.isArray(modelMessages)) {
          allMessages = [...allMessages, ...modelMessages];
        }
      });

      const userMessages = allMessages.filter((msg) => msg.role === "user");
      const lastUserMsg = userMessages.length > 0
        ? userMessages[userMessages.length - 1].content
        : "(No user messages yet)";

      const getDisplayDate = (chat) => {
        if (!chat.lastUpdated) return new Date();
        try {
          if (chat.lastUpdated.toDate && typeof chat.lastUpdated.toDate === 'function') {
            return chat.lastUpdated.toDate();
          }
          if (chat.lastUpdated instanceof Date) {
            return chat.lastUpdated;
          }
          if (typeof chat.lastUpdated === 'number') {
            return new Date(chat.lastUpdated);
          }
          if (typeof chat.lastUpdated === 'string') {
            return new Date(chat.lastUpdated);
          }
          return new Date();
        } catch (error) {
          return new Date();
        }
      };

      const lastUpdated = getDisplayDate(chat);
      
      return {
        chatId: chat.chatId || chat.id,
        message: lastUserMsg,
        lastMsgDate: moment(lastUpdated).fromNow(),
      };
    } catch (error) {
      console.error("Error getting last message from chat:", error);
      return null;
    }
  };

  const GetRemainingMsgs = async () => {
    try {
      const result = await axios.post("/api/user-remaining-msg", {});
      setFreeMsgCount(result?.data?.remainingToken ?? 0);
    } catch (err) {
      console.error("Error fetching remaining messages:", err);
      setFreeMsgCount(0);
    }
  };

  //  FIX: Remove reload from new chat
  const handleNewChat = () => {
    const newChatId = uuidv4();
    console.log(" Creating new chat:", newChatId);
    router.push(`/?chatId=${newChatId}`);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="logo"
              width={60}
              height={60}
              className="w-[40px] h-[40px]"
            />
            <h2 className="font-bold text-xl">AI FUSION</h2>
          </div>
          <div>
            {theme === "light" ? (
              <Button variant="ghost" onClick={() => setTheme("dark")}>
                <Sun />
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setTheme("light")}>
                <Moon />
              </Button>
            )}
          </div>
        </div>

        {user ? (
          <Button className="mt-7 w-full" onClick={handleNewChat}>
            +New Chat
          </Button>
        ) : (
          <SignInButton>
            <Button className="mt-7 w-full">+New Chat</Button>
          </SignInButton>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="p-3">
            <h2 className="font-bold text-lg">Chat</h2>
            {!user && (
              <p className="text-sm text-gray-400">
                Sign in to chat with multiple AI model
              </p>
            )}

            {chatHistory.length === 0 && user && (
              <p className="text-sm text-gray-500 py-2">No chat history yet</p>
            )}

            {chatHistory.map((chat, index) => {
              const last = GetLastUserMessageFromChat(chat);
              if (!last) return null;

              return (
                <Link 
                  href={`/?chatId=${last.chatId}`} 
                  key={chat.id || index}
                  //  FIX: Remove reload  let ChatInputBox handle loading
                >
                  <div className="py-2 hover:bg-gray-300 dark:hover:bg-gray-700 px-2 rounded cursor-pointer transition">
                    <h2 className="text-sm truncate font-medium">{last.message}</h2>
                    <p className="text-xs text-gray-500">{last.lastMsgDate}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 mb-10">
          {!user ? (
            <SignInButton mode="modal">
              <Button className="w-full" size="lg">
                SignIn/SignUp
              </Button>
            </SignInButton>
          ) : (
          
            <div>
              <UsageCreditProgress remainingToken={freeMsgCount} />
              <PricingModal>
              <Button className="w-full mb-3">
                <Zap />
                Upgrade Plan
              </Button>
              </PricingModal>
              <Button className="flex" variant="ghost">
                <User2 />
                <h2>Settings</h2>
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}