import { GymForm } from "@/components/super-admin/gym-form";

export default function NewGymPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Gimnasio</h1>
      <GymForm mode="create" />
    </div>
  );
}
