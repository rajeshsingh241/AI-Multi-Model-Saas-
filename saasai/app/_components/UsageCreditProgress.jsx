"use client";
import React from 'react'
import { Progress } from "@/components/ui/progress"

export function  UsageCreditProgress({remainingToken})  {
  return (
    <div className="p-3 border rounded-lg mb-5 flex flex-col gap-2">
       <h2 className="font-bold text-xl"> Free Plan</h2>
     <p className="text-gray-400" > {5-remainingToken}/5 message Used</p>
         <Progress value={100-((5-remainingToken)/5)*100}/>
    </div>
  )
}
