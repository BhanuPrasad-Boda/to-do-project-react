export interface AppointmentContract {
  Appointment_Id: number;
  Title: string;
  Description?: string;
  Date?: Date;
  UserId: string;
  completed?: boolean;
  Priority?: "Low" | "Medium" | "High";
  status?: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  category?: string;
  tags?: string[];
  dueTime?: string;
  notes?: string;
  recurrence?: string;
  reminderOffsetMinutes?: number;
}
