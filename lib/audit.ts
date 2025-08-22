import { createClient } from "./supabase"

export interface AuditLog {
  id: string
  userId: string
  userName: string
  userRole: "patient" | "doctor"
  action: "upload" | "share" | "access" | "download" | "login" | "logout"
  resourceType: "record" | "system"
  resourceId?: string
  resourceName?: string
  details: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export class AuditService {
  private static supabase = createClient()

  private static async encryptAuditDetails(details: string): Promise<string> {
    try {
      // Use a simple encryption for audit details (in production, use proper key management)
      const encoder = new TextEncoder()
      const data = encoder.encode(details)
      const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])

      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)

      // For demo purposes, return base64 encoded (in production, store key securely)
      return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    } catch (error) {
      console.error("Error encrypting audit details:", error)
      return details // Fallback to unencrypted
    }
  }

  // Log an audit event
  static async logEvent(event: Omit<AuditLog, "id" | "timestamp" | "ipAddress" | "userAgent">): Promise<void> {
    try {
      const encryptedDetails = await this.encryptAuditDetails(event.details)

      const { error } = await this.supabase.from("audit_logs").insert({
        user_id: event.userId,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        encrypted_details: encryptedDetails,
        ip_address: "127.0.0.1", // Demo IP - in production, get real IP
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "Server",
      })

      if (error) {
        console.error("Error logging audit event:", error)
        // Fallback to localStorage for demo
        this.logEventLocally(event)
      }
    } catch (error) {
      console.error("Error logging audit event:", error)
      // Fallback to localStorage for demo
      this.logEventLocally(event)
    }
  }

  private static logEventLocally(event: Omit<AuditLog, "id" | "timestamp" | "ipAddress" | "userAgent">): void {
    const auditLog: AuditLog = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Server",
    }

    const logs = localStorage.getItem("healthlock_audit_logs")
    const allLogs: AuditLog[] = logs ? JSON.parse(logs) : []
    allLogs.push(auditLog)

    if (allLogs.length > 1000) {
      allLogs.splice(0, allLogs.length - 1000)
    }

    localStorage.setItem("healthlock_audit_logs", JSON.stringify(allLogs))
  }

  // Get audit logs for a specific user or resource
  static async getAuditLogs(filters?: {
    userId?: string
    resourceId?: string
    action?: string
    limit?: number
  }): Promise<AuditLog[]> {
    try {
      let query = this.supabase.from("audit_logs").select("*").order("created_at", { ascending: false })

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId)
      }
      if (filters?.resourceId) {
        query = query.eq("resource_id", filters.resourceId)
      }
      if (filters?.action) {
        query = query.eq("action", filters.action)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error getting audit logs:", error)
        return this.getAuditLogsLocally(filters)
      }

      return data.map((log) => ({
        id: log.id,
        userId: log.user_id,
        userName: "User", // Would need to join with users table for real name
        userRole: "patient" as const, // Would need to join with users table for real role
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        resourceName: undefined,
        details: log.encrypted_details || "",
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        timestamp: log.created_at,
      }))
    } catch (error) {
      console.error("Error getting audit logs:", error)
      return this.getAuditLogsLocally(filters)
    }
  }

  private static getAuditLogsLocally(filters?: {
    userId?: string
    resourceId?: string
    action?: string
    limit?: number
  }): AuditLog[] {
    const logs = localStorage.getItem("healthlock_audit_logs")
    let allLogs: AuditLog[] = logs ? JSON.parse(logs) : []

    if (filters?.userId) {
      allLogs = allLogs.filter((log) => log.userId === filters.userId)
    }
    if (filters?.resourceId) {
      allLogs = allLogs.filter((log) => log.resourceId === filters.resourceId)
    }
    if (filters?.action) {
      allLogs = allLogs.filter((log) => log.action === filters.action)
    }

    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (filters?.limit) {
      allLogs = allLogs.slice(0, filters.limit)
    }

    return allLogs
  }

  // Get recent activity summary
  static async getActivitySummary(userId: string): Promise<{
    totalActions: number
    recentUploads: number
    recentShares: number
    recentAccess: number
  }> {
    const logs = await this.getAuditLogs({ userId })
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const recentLogs = logs.filter((log) => new Date(log.timestamp) > last30Days)

    return {
      totalActions: logs.length,
      recentUploads: recentLogs.filter((log) => log.action === "upload").length,
      recentShares: recentLogs.filter((log) => log.action === "share").length,
      recentAccess: recentLogs.filter((log) => log.action === "access").length,
    }
  }
}
