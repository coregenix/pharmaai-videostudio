import Link from "next/link";
const T = [
  ["Mechanism of action of propranolol", "B.Pharm", "Receptor blockade and cardiovascular effects"],
  ["Pharmacokinetics: ADME overview", "D.Pharm", "Absorption, distribution, metabolism, excretion"],
  ["Cholinergic agonists and antagonists", "GPAT", "Classification and exam points"],
  ["Beta-lactam antibiotics: classification and mechanism", "B.Pharm", "Penicillins to carbapenems"],
  ["Neurotransmitters in the CNS", "M.Pharm", "Synthesis, receptors, drug targets"],
  ["Pharmacovigilance and adverse drug reaction reporting", "M.Pharm", "ADR types and reporting systems"],
  ["Antiepileptic drugs: mechanisms", "GPAT", "Sodium channel, GABA and calcium channel actions"],
  ["Dose-response relationship and receptor theory", "Beginner", "Potency, efficacy, agonists, antagonists"],
];
export default function Templates() {
  return (<div className="space-y-4"><h1 className="text-3xl">Templates</h1><p className="text-slate-400">Starting points for common syllabus topics. Choose one to prefill the Create form.</p>
    <div className="grid gap-3 sm:grid-cols-2">{T.map(([t, l, d]) => (
      <Link key={t} href={`/create?topic=${encodeURIComponent(t)}&level=${encodeURIComponent(l)}`} className="card hover:border-lab-500"><div className="font-medium text-white">{t}</div><div className="mt-1 text-sm text-slate-400">{d}</div><div className="mt-2 text-xs text-lab-300">{l}</div></Link>))}</div></div>);
}
