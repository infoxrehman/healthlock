"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, Share2, LogOut, Shield } from "lucide-react"
import { type User, type PatientRecord, StorageService } from "@/lib/storage"
import { EncryptionService } from "@/lib/encryption"
import { ShareRecordDialog } from "@/components/share-record-dialog"
import { AuditLogViewer } from "@/components/audit-log-viewer"
import { ActivitySummary } from "@/components/activity-summary"
import { AuditService } from "@/lib/audit"

interface PatientDashboardProps {
  user: User
  onLogout: () => void
}

export function PatientDashboard({ user, onLogout }: PatientDashboardProps) {
  const [records, setRecords] = useState<PatientRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [shareDialog, setShareDialog] = useState<{ open: boolean; record: PatientRecord | null }>({
    open: false,
    record: null,
  })

  useEffect(() => {
    loadRecords()
    AuditService.logEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "login",
      resourceType: "system",
      details: `${user.name} logged into the system`,
    })
  }, [user.id])

  const loadRecords = async () => {
    const userRecords = await StorageService.getPatientRecords(user.id)
    setRecords(userRecords)
  }

  const handleShare = (record: PatientRecord) => {
    setShareDialog({ open: true, record })
  }

  const handleShareComplete = () => {
    loadRecords() // Reload to show updated sharing status
  }

  const handleLogout = async () => {
    await AuditService.logEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "logout",
      resourceType: "system",
      details: `${user.name} logged out of the system`,
    })
    onLogout()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Generate AES key for file encryption
      const aesKey = await EncryptionService.generateAESKey()

      // Encrypt the file
      const { encryptedData, iv } = await EncryptionService.encryptFile(file, aesKey)

      // For demo, we'll store the AES key directly (in real app, it would be encrypted with user's public key)
      const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey)

      const recordData = {
        patientId: user.id,
        fileName: file.name,
        fileType: file.type,
        encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        iv: btoa(String.fromCharCode(...iv)),
        encryptedKey: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
        sharedWith: [],
      }

      const savedRecord = await StorageService.savePatientRecord(recordData)

      if (savedRecord) {
        await AuditService.logEvent({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: "upload",
          resourceType: "record",
          resourceId: savedRecord.id,
          resourceName: savedRecord.fileName,
          details: `Uploaded encrypted medical record: ${savedRecord.fileName}`,
        })

        await loadRecords()
      } else {
        throw new Error("Failed to save record")
      }

      // Reset file input
      e.target.value = ""
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-serif font-bold text-primary">HealthLock</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.name}</span>
              <Badge variant="secondary">Patient</Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="records" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="records">My Records</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Upload Section */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Records</span>
                    </CardTitle>
                    <CardDescription>Securely upload your medical records with end-to-end encryption</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file-upload">Select File</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="mt-1"
                        />
                      </div>
                      {uploading && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Encrypting and uploading...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Records List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>My Records ({records.length})</span>
                    </CardTitle>
                    <CardDescription>Your encrypted medical records</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {records.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No records uploaded yet</p>
                        <p className="text-sm">Upload your first medical record to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {records.map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <div>
                                <h3 className="font-medium">{record.fileName}</h3>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <span>Uploaded {new Date(record.uploadedAt).toLocaleDateString()}</span>
                                  {record.sharedWith.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <div className="flex items-center space-x-1">
                                        <Share2 className="h-3 w-3" />
                                        <span>Shared with {record.sharedWith.length} doctor(s)</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                Encrypted
                              </Badge>
                              <Button variant="outline" size="sm" onClick={() => handleShare(record)}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <ActivitySummary user={user} />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <AuditLogViewer user={user} />
          </TabsContent>
        </Tabs>
      </main>

      {shareDialog.record && (
        <ShareRecordDialog
          record={shareDialog.record}
          user={user}
          open={shareDialog.open}
          onOpenChange={(open) => setShareDialog({ open, record: open ? shareDialog.record : null })}
          onShare={handleShareComplete}
        />
      )}
    </div>
  )
}
