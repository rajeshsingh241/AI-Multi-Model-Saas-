import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PricingTable } from '@clerk/nextjs'
function PricingModal({children}) {
  return (

      <Dialog>
  <DialogTrigger>
  <div className="w-full">{children}</div>
  
  
  
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Upgrade Plan</DialogTitle>
      <DialogDescription>
     <PricingTable/>
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
   
  )
}

export default PricingModal
