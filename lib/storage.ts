import { createClient } from "./supabase"
import { EncryptionService } from "./encryption"

export interface User {
  id: string
  email: string
  name: string
  role: "patient" | "doctor"
  publicKey?: string
  privateKey?: string
}

export interface PatientRecord {
  id: string
  patientId: string
  fileName: string
  fileType: string
  encryptedData: string
  iv: string
  encryptedKey: string
  uploadedAt: string
  sharedWith: string[]
}

export interface ShareRequest {
  id: string
  recordId: string
  patientId: string
  doctorId: string
  doctorEmail: string
  doctorName: string
  expiresAt: string
  accessLevel: "view" | "download"
  status: "pending" | "approved" | "denied"
  createdAt: string
}

export class StorageService {
  private static supabase = createClient()

  private static async deriveEncryptionKey(password: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    )

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    )
  }

  private static async encryptData(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(data))

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    }
  }

  private static async decryptData(encryptedData: string, iv: string, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder()
    const encrypted = new Uint8Array(
      atob(encryptedData)
        .split("")
        .map((c) => c.charCodeAt(0)),
    )
    const ivArray = new Uint8Array(
      atob(iv)
        .split("")
        .map((c) => c.charCodeAt(0)),
    )

    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: ivArray }, key, encrypted)

    return decoder.decode(decrypted)
  }

  // User management
  static async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      if (!user) return null

      const { data: userData, error } = await this.supabase.from("users").select("*").eq("id", user.id).single()

      if (error) throw error

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        publicKey: userData.public_key,
        privateKey: userData.encrypted_private_key,
      }
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  }

  static async createUser(
    email: string,
    password: string,
    name: string,
    role: "patient" | "doctor",
  ): Promise<User | null> {
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("User creation failed")

      // Generate RSA key pair for encryption
      const keyPair = await EncryptionService.generateKeyPair()
      const publicKeyString = await EncryptionService.exportPublicKey(keyPair.publicKey)

      // Encrypt private key with user password
      const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
      const encryptionKey = await this.deriveEncryptionKey(password, email)
      const { encrypted: encryptedPrivateKey } = await this.encryptData(
        btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer))),
        encryptionKey,
      )

      // Create user record in database
      const { data: userData, error: userError } = await this.supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email,
          name,
          role,
          public_key: publicKeyString,
          encrypted_private_key: encryptedPrivateKey,
        })
        .select()
        .single()

      if (userError) throw userError

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        publicKey: userData.public_key,
        privateKey: userData.encrypted_private_key,
      }
    } catch (error) {
      console.error("Error creating user:", error)
      return null
    }
  }

  static async signIn(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return await this.getCurrentUser()
    } catch (error) {
      console.error("Error signing in:", error)
      return null
    }
  }

  static async logout(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  // Patient records
  static async getPatientRecords(patientId: string): Promise<PatientRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from("patient_records")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data.map((record) => ({
        id: record.id,
        patientId: record.patient_id,
        fileName: record.file_name,
        fileType: record.file_type,
        encryptedData: record.encrypted_data,
        iv: record.iv,
        encryptedKey: record.encrypted_key,
        uploadedAt: record.created_at,
        sharedWith: [], // Will be populated from share_requests
      }))
    } catch (error) {
      console.error("Error getting patient records:", error)
      return []
    }
  }

  static async savePatientRecord(record: Omit<PatientRecord, "id" | "uploadedAt">): Promise<PatientRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from("patient_records")
        .insert({
          patient_id: record.patientId,
          file_name: record.fileName,
          file_type: record.fileType,
          encrypted_data: record.encryptedData,
          iv: record.iv,
          encrypted_key: record.encryptedKey,
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        patientId: data.patient_id,
        fileName: data.file_name,
        fileType: data.file_type,
        encryptedData: data.encrypted_data,
        iv: data.iv,
        encryptedKey: data.encrypted_key,
        uploadedAt: data.created_at,
        sharedWith: [],
      }
    } catch (error) {
      console.error("Error saving patient record:", error)
      return null
    }
  }

  // Share requests
  static async getShareRequests(userId: string, role: "patient" | "doctor"): Promise<ShareRequest[]> {
    try {
      const column = role === "patient" ? "patient_id" : "doctor_id"
      const { data, error } = await this.supabase
        .from("share_requests")
        .select("*")
        .eq(column, userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data.map((request) => ({
        id: request.id,
        recordId: request.record_id,
        patientId: request.patient_id,
        doctorId: request.doctor_id,
        doctorEmail: request.doctor_email,
        doctorName: request.doctor_name,
        expiresAt: request.expires_at,
        accessLevel: request.access_level,
        status: request.status,
        createdAt: request.created_at,
      }))
    } catch (error) {
      console.error("Error getting share requests:", error)
      return []
    }
  }

  static async saveShareRequest(request: Omit<ShareRequest, "id" | "createdAt">): Promise<ShareRequest | null> {
    try {
      const { data, error } = await this.supabase
        .from("share_requests")
        .insert({
          record_id: request.recordId,
          patient_id: request.patientId,
          doctor_id: request.doctorId,
          doctor_email: request.doctorEmail,
          doctor_name: request.doctorName,
          expires_at: request.expiresAt,
          access_level: request.accessLevel,
          status: request.status,
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        recordId: data.record_id,
        patientId: data.patient_id,
        doctorId: data.doctor_id,
        doctorEmail: data.doctor_email,
        doctorName: data.doctor_name,
        expiresAt: data.expires_at,
        accessLevel: data.access_level,
        status: data.status,
        createdAt: data.created_at,
      }
    } catch (error) {
      console.error("Error saving share request:", error)
      return null
    }
  }

  static async getSharedRecords(doctorId: string): Promise<(PatientRecord & { patientName: string })[]> {
    try {
      const { data, error } = await this.supabase
        .from("share_requests")
        .select(`
          *,
          patient_records (*),
          users!patient_id (name)
        `)
        .eq("doctor_id", doctorId)
        .eq("status", "approved")
        .gt("expires_at", new Date().toISOString())

      if (error) throw error

      return data.map((share) => ({
        id: share.patient_records.id,
        patientId: share.patient_records.patient_id,
        fileName: share.patient_records.file_name,
        fileType: share.patient_records.file_type,
        encryptedData: share.patient_records.encrypted_data,
        iv: share.patient_records.iv,
        encryptedKey: share.patient_records.encrypted_key,
        uploadedAt: share.patient_records.created_at,
        sharedWith: [],
        patientName: share.users.name,
      }))
    } catch (error) {
      // console.error("Error getting shared records:", error)
      return []
    }
  }

  // Demo users - Remove in production
  static initializeDemoUsers(): void {
    // This method is no longer needed with Supabase
    console.log("Demo users initialization not needed with Supabase")
  }

  static getDemoUsers(): User[] {
    // This method is no longer needed with Supabase
    return []
  }
}
