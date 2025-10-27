import axios from "axios";
import { NextResponse } from "next/server";
import { enabledModelIds } from "@/shared/AiModelsShared";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log(" Received request body:", JSON.stringify(body, null, 2));

    const { model, msg, parentModel } = body;

    if (!process.env.KRAVIXSTUDIO_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    //  FIX: Normalize model names for validation
    const normalizedModel = model.replace(/\s+/g, '-'); // Convert spaces to hyphens
    
    if (!normalizedModel || !enabledModelIds.includes(normalizedModel)) {
      console.error("Invalid AI Model:", model, "Normalized:", normalizedModel);
      return NextResponse.json({ 
        error: `Invalid AI Model: ${model}. Available: ${enabledModelIds.join(', ')}` 
      }, { status: 400 });
    }

    if (!msg || !Array.isArray(msg) || msg.length === 0 || !msg[0]?.content) {
      console.error("Invalid or empty message:", msg);
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const kravixPayload = {
      message: msg,
      aiModel: normalizedModel, 
      outputType: "text"
    };
    
    console.log(" Sending to Kravix API:", JSON.stringify(kravixPayload, null, 2));

    const response = await axios.post(
      "https://kravixstudio.com/api/v1/chat",
      kravixPayload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.KRAVIXSTUDIO_API_KEY,
        },
        timeout: 70000,
      }
    );

    console.log(" Kravix API response received");

    return NextResponse.json({
      aiResponse: response.data?.response || response.data?.aiResponse || "No response from AI",
      model: parentModel,
    });

  } catch (err) {
    console.error("AI Multi-Model Route Error:", err.response?.data || err.message);
    
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return NextResponse.json({ error: "AI server timed out. Try again later." }, { status: 504 });
    }
    
    if (err.response?.data) {
      return NextResponse.json(
        { 
          error: err.response.data.error || err.response.data.message || "AI API error"
        },
        { status: err.response.status || 500 }
      );
    }
    
    return NextResponse.json({ 
      error: "Internal Server Error"
    }, { status: 500 });
  }
}