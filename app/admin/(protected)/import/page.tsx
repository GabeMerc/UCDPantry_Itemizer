import CsvImporter from "@/components/admin/CsvImporter";

export default function ImportPage() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import CSV</h1>
        <p className="text-gray-500 mt-1">
          Upload a spreadsheet export from any source. You will map the columns
          before anything is saved.
        </p>
      </div>
      <CsvImporter />
    </div>
  );
}
