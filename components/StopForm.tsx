import { useState } from "react";

interface StopFormProps {
  onAdd: (stop: string) => void;
}

export default function StopForm({ onAdd }: StopFormProps) {
  const [stop, setStop] = useState("");

  const handleAdd = () => {
    if (!stop) return;
    onAdd(stop);
    setStop("");
  };

  return (
    <div className="flex gap-2 mt-4">
      <input
        type="text"
        placeholder="Add stop (e.g., Mall Road)"
        value={stop}
        onChange={(e) => setStop(e.target.value)}
        className="flex-1 border p-2 rounded-lg"
      />

      <button
        onClick={handleAdd}
        className="bg-blue-600 text-white px-4 rounded-lg"
      >
        Add
      </button>
    </div>
  );
}
