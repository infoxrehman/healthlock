"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Share2, Eye, TrendingUp } from "lucide-react"
import { AuditService } from "@/lib/audit"
import type { User } from "@/lib/storage"

interface ActivitySummaryProps {
  user: User
}

export function ActivitySummary({ user }: ActivitySummaryProps) {
  const [summary, setSummary] = useState({
    totalActions: 0,
    recentUploads: 0,
    recentShares: 0,
    recentAccess: 0,
  })

  useEffect(() => {
    const activitySummary = AuditService.getActivitySummary(user.id)
    setSummary(activitySummary)
  }, [user.id])

  const stats = [
    {
      title: "Recent Uploads",
      value: summary.recentUploads,
      icon: Upload,
      description: "Last 30 days",
      color: "text-blue-600",
    },
    {
      title: "Recent Shares",
      value: summary.recentShares,
      icon: Share2,
      description: "Last 30 days",
      color: "text-green-600",
    },
    {
      title: "Recent Access",
      value: summary.recentAccess,
      icon: Eye,
      description: "Last 30 days",
      color: "text-yellow-600",
    },
    {
      title: "Total Actions",
      value: summary.totalActions,
      icon: TrendingUp,
      description: "All time",
      color: "text-primary",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
