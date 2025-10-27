"use client";

import React, { useContext } from "react";
import { Switch } from "@/components/ui/switch";
import { AiSelectModelContext } from "@/context/AiSelectedModelContext";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import AiModelList from "@/shared/AiModelList";
import { MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectGroup } from "@radix-ui/react-select";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";
import { DefaultModel } from "@/shared/AiModelsShared";

function AiMultiModels() {
  const { user } = useUser();
  const { aiSelectedModels, setAiSelectedModels, messages } =
    useContext(AiSelectModelContext);

  
  console.log(" AiMultiModels - Current aiSelectedModels:", JSON.parse(JSON.stringify(aiSelectedModels || {})));
  console.log(" AiMultiModels - Current messages:", JSON.parse(JSON.stringify(messages || {})));

  const onToggleChange = (model, value) => {
    console.log(` Toggling ${model} to:`, value);
    setAiSelectedModels((prev) => ({
      ...prev,
      [model]: { 
        ...(prev?.[model] ?? {}), 
        enable: value,
        modelId: prev?.[model]?.modelId || DefaultModel[model]?.modelId
      },
    }));
  };

  const onSelectValue = async (parentModel, selectedId) => {
    console.log(` Selecting model ${selectedId} for ${parentModel}`);
    const updatedModels = {
      ...aiSelectedModels,
      [parentModel]: {
        ...(aiSelectedModels[parentModel] ?? {}),
        modelId: selectedId,
      },
    };
    setAiSelectedModels(updatedModels);

    if (user?.primaryEmailAddress?.emailAddress) {
      const docRef = doc(db, "users", user.primaryEmailAddress.emailAddress);
      await updateDoc(docRef, { selectModelpref: updatedModels });
    }
  };

  return (
    <div className="flex flex-1 h-[75vh] border-b">
      {AiModelList.map((model, index) => {
        const currentModel =
          aiSelectedModels?.[model.model]?.modelId ||
          DefaultModel?.[model.model]?.modelId ||
          "";

        //  Get enabled status from aiSelectedModels
        const isModelEnabled = aiSelectedModels?.[model.model]?.enable ?? false;
        const modelMessages = messages?.[model.model] || [];
        
     
        console.log(` ${model.model}:`, {
          enabled: isModelEnabled,
          messageCount: modelMessages.length,
          hasMessages: modelMessages.length > 0,
          currentModel: currentModel
        });

        return (
          <div
            key={index}
            className={`flex flex-col h-full border-r transition-all duration-300 ${
              isModelEnabled ? "flex-1 min-w-[400px]" : "w-[100px] flex-none"
            }`}
          >
            <div className="flex w-full items-center justify-between p-3">
              <div className="flex items-center gap-4">
                <Image
                  src={model.icon}
                  alt={model.model}
                  width={24}
                  height={24}
                />
                {isModelEnabled && (
                  <Select
                    value={currentModel}
                    onValueChange={(value) => onSelectValue(model.model, value)}
                    disabled={model.premium}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue
                        placeholder={currentModel || "Select model"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup className="p-3">
                        <SelectLabel>Free</SelectLabel>
                        {model.subModel.map(
                          (sm) =>
                            !sm.premium && (
                              <SelectItem key={sm.id} value={sm.id}>
                                {sm.name}
                              </SelectItem>
                            )
                        )}
                      </SelectGroup>
                      <SelectGroup className="px-3">
                        <SelectLabel className="text-sm text-gray-400">
                          Premium
                        </SelectLabel>
                        {model.subModel.map(
                          (sm) =>
                            sm.premium && (
                              <SelectItem key={sm.id} value={sm.id} disabled>
                                {sm.name}
                                <Lock className="ml-2 h-4 w-4" />
                              </SelectItem>
                            )
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                {isModelEnabled ? (
                  <Switch
                    checked={isModelEnabled}
                    onCheckedChange={(v) => onToggleChange(model.model, v)}
                  />
                ) : (
                  <MessageSquare
                    className="cursor-pointer"
                    onClick={() => onToggleChange(model.model, true)}
                  />
                )}
              </div>
            </div>

            {model.premium && isModelEnabled && (
              <div className="flex flex-1 items-center justify-center">
                <Button>
                  <Lock className="mr-2 h-4 w-4" />
                  Upgrade to unlock
                </Button>
              </div>
            )}

            {isModelEnabled && !model.premium && (
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3 break-words">
                  {modelMessages && Array.isArray(modelMessages) && modelMessages.length > 0 ? (
                    modelMessages.map((m, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg shadow-sm max-w-full ${
                          m.role === "user"
                            ? "bg-blue-500 text-white ml-auto max-w-[80%]"
                            : "bg-gray-100 text-gray-900 mr-auto max-w-[80%] border"
                        }`}
                      >
                        {m.role === "assistant" && (
                          <span className="block text-xs text-gray-500 mb-1">
                            {m.model ?? model.model}
                          </span>
                        )}
                        {m.loading ? (
                          <div className="flex items-center gap-2">
                            <Loader className="animate-spin h-4 w-4 text-gray-500" />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <MessageSquare className="h-12 w-12 mb-2" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start a conversation!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isModelEnabled && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Click to enable</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default AiMultiModels;