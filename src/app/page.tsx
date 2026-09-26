import { readSupabase } from "@/lib/supabase";

type Employee = {
  id: string;
  name: string;
  role: string;
};

export default async function Home() {
  let staff: Employee[] = [];
  let connectionMessage = "Supabase connection is not available yet.";

  try {
    staff = await readSupabase<Employee>("employees");
    connectionMessage = `Supabase connected: ${staff.length} employees found.`;
  } catch {
    connectionMessage = "Supabase connection needs checking.";
  }

  return (
    <main>
      <p className="eyebrow">Friends Included Ltd</p>
      <h1>Finance system</h1>
      <p>{connectionMessage}</p>
      {staff.length > 0 && (
        <ul>
          {staff.map((employee) => <li key={employee.id}>{employee.name} — {employee.role}</li>)}
        </ul>
      )}
    </main>
  );
}
