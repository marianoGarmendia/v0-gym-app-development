import { GymsTable } from "@/components/super-admin/gyms-table";

export default function GymsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gimnasios</h1>
      <GymsTable />
    </div>
  );
}
