"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Share2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { PatientRecord, User } from "@/lib/storage"
import { StorageService } from "@/lib/storage"
import { AuditService } from "@/lib/audit"

interface ShareRecordDialogProps {
  record: PatientRecord
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onShare: () => void
}

export function ShareRecordDialog({ record, user, open, onOpenChange, onShare }: ShareRecordDialogProps) {
  const [doctorEmail, setDoctorEmail] = useState("")
  const [expiryDate, setExpiryDate] = useState<Date>()
  const [accessLevel, setAccessLevel] = useState<"view" | "download">("view")
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    if (!doctorEmail || !expiryDate) {
      alert("Please fill in all fields")
      return
    }

    setSharing(true)
    try {
      // Find doctor by email (in demo, we'll use demo doctors)
      const demoUsers = StorageService.getDemoUsers()
      const doctor = demoUsers.find((u) => u.email === doctorEmail && u.role === "doctor")

      if (!doctor) {
        alert("Doctor not found. Try doctor@demo.com")
        setSharing(false)
        return
      }

      // Create share request
      const shareRequest = {
        id: `share-${Date.now()}`,
        recordId: record.id,
        patientId: user.id,
        doctorId: doctor.id,
        doctorEmail: doctor.email,
        doctorName: doctor.name,
        expiresAt: expiryDate.toISOString(),
        accessLevel,
        status: "approved" as const, // Auto-approve for demo
        createdAt: new Date().toISOString(),
      }

      StorageService.saveShareRequest(shareRequest)

      // Update record to include shared doctor
      const updatedRecord = {
        ...record,
        sharedWith: [...record.sharedWith, doctor.id],
      }
      StorageService.updatePatientRecord(updatedRecord)

      AuditService.logEvent({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "share",
        resourceType: "record",
        resourceId: record.id,
        resourceName: record.fileName,
        details: `Shared medical record "${record.fileName}" with Dr. ${doctor.name} (${doctor.email}) with ${accessLevel} access until ${format(expiryDate, "PPP")}`,
      })

      onShare()
      onOpenChange(false)
      setDoctorEmail("")
      setExpiryDate(undefined)
      setAccessLevel("view")
    } catch (error) {
      console.error("Share error:", error)
      alert("Failed to share record")
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Medical Record</span>
          </DialogTitle>
          <DialogDescription>Share "{record.fileName}" securely with a healthcare provider</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doctor-email">Doctor's Email</Label>
            <Input
              id="doctor-email"
              type="email"
              placeholder="doctor@example.com"
              value={doctorEmail}
              onChange={(e) => setDoctorEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Demo: Use doctor@demo.com</p>
          </div>

          <div className="space-y-2">
            <Label>Access Level</Label>
            <Select value={accessLevel} onValueChange={(value: "view" | "download") => setAccessLevel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View Only</SelectItem>
                <SelectItem value="download">View & Download</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "PPP") : "Select expiry date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={sharing}>
            {sharing ? "Sharing..." : "Share Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
