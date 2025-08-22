"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, FileText, Share2, Eye, Upload, LogIn, LogOut, Filter } from "lucide-react"
import { AuditService, type AuditLog } from "@/lib/audit"
import type { User } from "@/lib/storage"

interface AuditLogViewerProps {
  user: User
}

const actionIcons = {
  upload: Upload,
  share: Share2,
  access: Eye,
  download: FileText,
  login: LogIn,
  logout: LogOut,
}

const actionColors = {
  upload: "bg-blue-100 text-blue-800",
  share: "bg-green-100 text-green-800",
  access: "bg-yellow-100 text-yellow-800",
  download: "bg-purple-100 text-purple-800",
  login: "bg-gray-100 text-gray-800",
  logout: "bg-gray-100 text-gray-800",
}

export function AuditLogViewer({ user }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use an async function inside useEffect to handle the async call
    const fetchLogs = async () => {
      setLoading(true)
      try {
        const filters: any = { userId: user.id, limit: 50 }
        if (filter !== "all") {
          filters.action = filter
        }

        const auditLogs = await AuditService.getAuditLogs(filters)
        // Defensive: ensure auditLogs is always an array
        setLogs(Array.isArray(auditLogs) ? auditLogs : [])
      } catch (error) {
        console.error("Failed to load audit logs:", error)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [user.id, filter])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action as keyof typeof actionIcons] || Activity
    return <Icon className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    return actionColors[action as keyof typeof actionColors] || "bg-gray-100 text-gray-800"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Audit Log</span>
            </CardTitle>
            <CardDescription>Track all actions and access to your medical records</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="upload">Uploads</SelectItem>
                <SelectItem value="share">Shares</SelectItem>
                <SelectItem value="access">Access</SelectItem>
                <SelectItem value="login">Logins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
            <p className="text-sm">Activity will appear here as you use the system</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {Array.isArray(logs) && logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                  <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {log.action.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <p className="text-sm font-medium">{log.details}</p>
                    {log.resourceName && (
                      <p className="text-xs text-muted-foreground mt-1">Resource: {log.resourceName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
