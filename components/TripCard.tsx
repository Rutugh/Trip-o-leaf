interface TripCardProps {
  trip: any;
  onDelete: (id: string) => void;
}

export default function TripCard({ trip, onDelete }: TripCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-lg transition p-6">
      <h3 className="text-lg font-bold text-gray-800">
        {trip.title}
      </h3>

      <p className="text-gray-500">{trip.destination}</p>

      <p className="text-sm text-gray-400 mt-2">
        {trip.startDate} - {trip.endDate}
      </p>

      <p className="mt-4 font-semibold text-blue-600">
        Budget: ₹{trip.budget}
      </p>

      <div className="flex justify-between mt-6">
        <button className="text-blue-600 text-sm">
          View
        </button>

        <button
          onClick={() => onDelete(trip.id)}
          className="text-red-500 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
