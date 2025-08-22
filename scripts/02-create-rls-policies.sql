-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Patient records policies
CREATE POLICY "Patients can view their own records" ON patient_records
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own records" ON patient_records
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own records" ON patient_records
  FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view shared records" ON patient_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM share_requests sr
      WHERE sr.record_id = patient_records.id
      AND sr.doctor_id = auth.uid()
      AND sr.status = 'approved'
      AND sr.expires_at > NOW()
    )
  );

-- Share requests policies
CREATE POLICY "Patients can view their share requests" ON share_requests
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create share requests" ON share_requests
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their share requests" ON share_requests
  FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their share requests" ON share_requests
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update share request status" ON share_requests
  FOR UPDATE USING (auth.uid() = doctor_id);

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
