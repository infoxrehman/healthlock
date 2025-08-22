"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, LogOut, Shield, Users, Eye, Share2 } from "lucide-react"
import { type User, StorageService } from "@/lib/storage"
import { AuditLogViewer } from "@/components/audit-log-viewer"
import { ActivitySummary } from "@/components/activity-summary"
import { AuditService } from "@/lib/audit"

interface DoctorDashboardProps {
  user: User
  onLogout: () => void
}

export function DoctorDashboard({ user, onLogout }: DoctorDashboardProps) {
  const [sharedRecords, setSharedRecords] = useState<(any & { patientName: string })[]>([])

  useEffect(() => {
    loadSharedRecords()
    AuditService.logEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "login",
      resourceType: "system",
      details: `${user.name} logged into the system`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  // Make loadSharedRecords async and handle Promise
  const loadSharedRecords = async () => {
    try {
      const records = await StorageService.getSharedRecords(user.id)
      setSharedRecords(Array.isArray(records) ? records : [])
    } catch (e) {
      setSharedRecords([])
    }
  }

  const handleLogout = () => {
    AuditService.logEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "logout",
      resourceType: "system",
      details: `${user.name} logged out of the system`,
    })
    onLogout()
  }

  const handleViewRecord = (record: any) => {
    AuditService.logEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "access",
      resourceType: "record",
      resourceId: record.id,
      resourceName: record.fileName,
      details: `Accessed medical record "${record.fileName}" from patient ${record.patientName}`,
    })

    // In a real app, this would open the decrypted file
    alert(`Viewing ${record.fileName} from ${record.patientName}`)
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
              <Badge variant="secondary">Doctor</Badge>
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
            <TabsTrigger value="records">Shared Records</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Stats */}
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{Array.isArray(sharedRecords) ? new Set(sharedRecords.map((r) => r.patientId)).size : 0}</p>
                          <p className="text-sm text-muted-foreground">Patients</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{Array.isArray(sharedRecords) ? sharedRecords.length : 0}</p>
                          <p className="text-sm text-muted-foreground">Shared Records</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Shared Records */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Patient Records Shared With Me</span>
                    </CardTitle>
                    <CardDescription>Securely access patient records shared with you</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(sharedRecords) && sharedRecords.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No records shared with you yet</p>
                        <p className="text-sm">Patients can share their encrypted records with you</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Array.isArray(sharedRecords) &&
                          sharedRecords.map((record) => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-4 border border-border rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                                <div>
                                  <h3 className="font-medium">{record.fileName}</h3>
                                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <span>Patient: {record.patientName}</span>
                                    <span>•</span>
                                    <span>Shared {new Date(record.uploadedAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  <Share2 className="h-3 w-3 mr-1" />
                                  Shared
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Encrypted
                                </Badge>
                                <Button variant="outline" size="sm" onClick={() => handleViewRecord(record)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
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
    </div>
  )
}
