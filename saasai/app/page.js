"use client"

import Image from "next/image";
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes";
import ChatInputBox from "./_components/ChatInputBox";


export default function Home() {
  const{setTheme}=useTheme();

  return (
    <div>
   <ChatInputBox/>
    </div>

  );
}







// 🧱 Step 1: Importing the Library

// When you wrote

// import { useTheme } from "next-themes";


// you are importing a React Hook from the next-themes library — which is a prebuilt theme management system made specially for Next.js + React.

// This hook gives you some ready-to-use tools like:

// theme → tells which theme is currently active (light, dark, or system)

// setTheme() → lets you switch the theme

// systemTheme → tells what your OS theme is set to

// ⚙️ Step 2: The Provider (Theme Context)

// In your provider.jsx, you wrapped your entire app with:

// <NextThemesProvider
//   attribute="class"
//   defaultTheme="system"
//   enableSystem
//   disableTransitionOnChange
// >
//   {children}
// </NextThemesProvider>


// This means every component inside your app now has access to that “theme context” — kind of like a shared global store for theme data.

// So anywhere in your app, you can just use:

// const { theme, setTheme } = useTheme();


// and it will automatically read and update the theme from that provider.

// 🎛 Step 3: Using the Prebuilt Function

// When you call:

// setTheme("dark");


// You are not defining a new function — you’re calling a prebuilt function provided by next-themes.

// That function:

// Adds a class="dark" to your <html> tag.

// Your Tailwind CSS detects that class (because Tailwind’s dark mode is class-based).

// All dark mode styles immediately apply.

// So you didn’t have to manually write any logic like:

// document.body.style.background = "black";