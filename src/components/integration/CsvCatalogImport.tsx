import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const TEMPLATE = `title,description,price,sku,stock,category,image_url
Canapé moderne 3 places,Canapé tissu gris confortable,899,SOFA-001,12,Canapé,https://example.com/sofa.jpg
Table à manger chêne,Table 6 personnes en chêne massif,649,TBL-002,8,Table,https://example.com/table.jpg
`;

const COPY = {
  fr: {
    title: "Import catalogue CSV",
    desc: "Importez votre catalogue produits via un fichier CSV pour entraîner Vendix.",
    button: "Choisir un fichier CSV",
    template: "Télécharger le modèle",
    preview: "Aperçu",
    imported: "produit(s) importé(s)",
    error: "Impossible de lire ce fichier CSV.",
  },
  en: {
    title: "CSV catalogue import",
    desc: "Upload your product catalogue via CSV to train Vendix.",
    button: "Choose a CSV file",
    template: "Download template",
    preview: "Preview",
    imported: "product(s) imported",
    error: "Unable to read this CSV file.",
  },
};

export function CsvCatalogImport() {
  const { language } = useTranslation();
  const t = COPY[language === "fr" ? "fr" : "en"];
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setRows(parsed);
      setFileName(file.name);
      try {
        localStorage.setItem("vendix_catalog_csv", JSON.stringify(parsed));
      } catch {}
      toast.success(`${parsed.length} ${t.imported}`);
    } catch (e) {
      console.error(e);
      toast.error(t.error);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendix-catalogue-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 text-slate-100">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <FileSpreadsheet className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{t.title}</h3>
          <p className="text-sm text-slate-300">{t.desc}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => inputRef.current?.click()}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          {t.button}
        </Button>
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {t.template}
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              {fileName} — {rows.length} {t.imported}
            </span>
          </div>
          <div className="rounded-lg border border-slate-700/50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-300">
                <tr>
                  {Object.keys(rows[0]).slice(0, 6).map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="text-slate-200">
                    {Object.keys(rows[0]).slice(0, 6).map((h) => (
                      <td key={h} className="px-3 py-2">{r[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
