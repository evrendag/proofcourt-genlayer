"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { ArrowUpRight, Bot, Check, CircleAlert, FileCheck2, Gavel, Link2, Loader2, Plus, Search, ShieldCheck, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

declare global {
  interface Window { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> }; }
  interface Document { modelContext?: { registerTool(tool: Record<string, unknown>, options?: { signal?: AbortSignal }): void | Promise<void> }; }
}

type WorkOrder = { requester?: string; worker?: string; agent_id?: string; specification?: string; criteria_json?: string; status?: string; attempts?: number | bigint; max_attempts?: number | bigint; latest_receipt_id?: number | bigint };
type Receipt = { work_id?: number | bigint; submitter?: string; delivery?: string; sources_json?: string; verdict?: string; score?: number | bigint; criteria_met?: number | bigint; criteria_total?: number | bigint; evidence_strength?: string; primary_gap?: string; rationale?: string; status?: string };

const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0xc8947448E5A3741d8D8c9dF09f91678e3eB06964";
const readClient = createClient({ chain: studionet });
const DEMO_SPEC = "Research the current purpose of the IANA example domains and provide a concise report supported by the official IANA page. The report must distinguish their intended use from ordinary registrable domains.";
const DEMO_CRITERIA = ["Identify the example domains maintained by IANA.", "Explain that the domains are reserved for documentation examples.", "Support every factual statement with the submitted official source."];
const DEMO_DELIVERY = "IANA maintains example.com, example.net and example.org for illustrative use in documentation. The official IANA page says they may be used without prior coordination and are not ordinary domains available for registration or transfer.";
const shortAddress = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not connected";

export default function Home() {
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT);
  const [account, setAccount] = useState("");
  const [worker, setWorker] = useState("");
  const [agentId, setAgentId] = useState("Research Agent #18");
  const [specification, setSpecification] = useState(DEMO_SPEC);
  const [criteria, setCriteria] = useState(DEMO_CRITERIA);
  const [workId, setWorkId] = useState("0");
  const [receiptId, setReceiptId] = useState("0");
  const [delivery, setDelivery] = useState(DEMO_DELIVERY);
  const [sources, setSources] = useState(["https://www.iana.org/help/example-domains"]);
  const [work, setWork] = useState<WorkOrder | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [tab, setTab] = useState("order");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Ready to create a verifiable work order.");
  const [txHash, setTxHash] = useState("");
  const validContract = /^0x[a-fA-F0-9]{40}$/.test(contractAddress);
  const validWorker = /^0x[a-fA-F0-9]{40}$/.test(worker);
  const cleanCriteria = useMemo(() => criteria.map((v) => v.trim()).filter(Boolean), [criteria]);
  const cleanSources = useMemo(() => sources.map((v) => v.trim()).filter(Boolean), [sources]);

  const walletClient = useCallback(() => {
    if (!account || !window.ethereum) throw new Error("Connect a wallet first.");
    return createClient({ chain: studionet, account: account as `0x${string}`, provider: window.ethereum as never });
  }, [account]);

  async function connectWallet() {
    if (!window.ethereum) throw new Error("Install MetaMask to sign GenLayer transactions.");
    setBusy("connect");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No wallet account was returned.");
      const client = createClient({ chain: studionet, account: address as `0x${string}`, provider: window.ethereum as never });
      await client.connect("studionet");
      setAccount(address); setWorker((current) => current || address); setMessage("Wallet connected to GenLayer Studio.");
    } finally { setBusy(null); }
  }

  async function wait(hash: `0x${string}`) {
    setTxHash(hash);
    await readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED });
  }

  async function createOrder() {
    if (!validContract || !validWorker) throw new Error("Enter valid contract and worker addresses.");
    if (specification.trim().length < 50 || cleanCriteria.length < 2) throw new Error("Add a detailed specification and at least two criteria.");
    setBusy("create");
    try {
      const counts = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_counts", args: [] }) as (number | bigint)[];
      const id = Number(counts[0]);
      const hash = await walletClient().writeContract({ address: contractAddress as `0x${string}`, functionName: "create_work_order", args: [worker, agentId.trim(), specification.trim(), JSON.stringify(cleanCriteria), 3], value: 0n });
      setMessage("Work order submitted. Waiting for finalization…"); await wait(hash); setWorkId(String(id)); setTab("delivery"); setMessage(`Work order #${id} is open for ${agentId}.`); await loadWork(String(id));
    } finally { setBusy(null); }
  }

  async function submitDelivery() {
    if (!validContract || delivery.trim().length < 50 || cleanSources.length < 1) throw new Error("Add a complete delivery and at least one HTTPS source.");
    setBusy("submit");
    try {
      const counts = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_counts", args: [] }) as (number | bigint)[];
      const id = Number(counts[1]);
      const hash = await walletClient().writeContract({ address: contractAddress as `0x${string}`, functionName: "submit_delivery", args: [Number(workId), delivery.trim(), JSON.stringify(cleanSources)], value: 0n });
      setMessage("Delivery submitted. Waiting for finalization…"); await wait(hash); setReceiptId(String(id)); setTab("receipt"); setMessage(`Receipt #${id} is pending validator review.`); await loadReceipt(String(id));
    } finally { setBusy(null); }
  }

  async function evaluateReceipt() {
    if (!validContract) throw new Error("Enter a deployed contract address.");
    setBusy("evaluate");
    try {
      const hash = await walletClient().writeContract({ address: contractAddress as `0x${string}`, functionName: "evaluate_receipt", args: [Number(receiptId)], value: 0n });
      setMessage("Validators are fetching sources and auditing every criterion…"); await wait(hash); await loadReceipt(receiptId); await loadWork(workId); setMessage("Full Consensus finalized. The Proof-of-Work Receipt is onchain.");
    } finally { setBusy(null); }
  }

  const loadWork = useCallback(async (target = workId) => {
    if (!validContract) throw new Error("Enter a deployed contract address.");
    const value = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_work_order", args: [Number(target)] }) as WorkOrder;
    setWork(value); setWorkId(String(target)); return value;
  }, [contractAddress, validContract, workId]);

  const loadReceipt = useCallback(async (target = receiptId) => {
    if (!validContract) throw new Error("Enter a deployed contract address.");
    setBusy("load");
    try {
      const value = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_receipt", args: [Number(target)] }) as Receipt;
      setReceipt(value); setReceiptId(String(target)); if (value?.work_id !== undefined) { setWorkId(String(Number(value.work_id))); await loadWork(String(Number(value.work_id))); }
      setMessage(value?.status === "NOT_FOUND" ? "Receipt not found." : "Onchain receipt loaded."); return value;
    } finally { setBusy(null); }
  }, [contractAddress, loadWork, receiptId, validContract]);

  function guarded(action: () => Promise<unknown>) { void action().catch((error) => { setBusy(null); setMessage(error instanceof Error ? error.message : "The operation failed."); }); }

  useEffect(() => {
    const context = document.modelContext; if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: "stage_proofcourt_demo", title: "Stage PROOFCOURT demo", description: "Populate the visible work order and delivery fields with the official IANA verification example without sending a transaction.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute() { setAgentId("Research Agent #18"); setSpecification(DEMO_SPEC); setCriteria(DEMO_CRITERIA); setDelivery(DEMO_DELIVERY); setSources(["https://www.iana.org/help/example-domains"]); setTab("order"); return { staged: true, criteria: 3, sources: 1 }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const verdict = receipt?.verdict ?? "UNASSESSED";
  const tone = verdict === "VERIFIED" ? "verified" : verdict === "REJECTED" ? "rejected" : verdict === "PARTIAL" ? "review" : "neutral";
  return (
    <main className="min-h-screen bg-[#07100f] text-[#ecf7f2]">
      <header className="border-b border-white/10 bg-[#07100f]/95"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#7cf7c5] text-[#07100f]"><Gavel size={21}/></div><div><p className="font-semibold tracking-tight">PROOFCOURT</p><p className="text-xs text-[#89a59b]">Proof-of-work receipts for AI agents</p></div></div><Button onClick={() => guarded(connectWallet)} disabled={!!busy} className="rounded-full bg-white text-[#07100f] hover:bg-[#dff8ee]"><Wallet size={16}/>{account ? shortAddress(account) : "Connect wallet"}</Button></div></header>
      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(390px,.75fr)] lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1715] shadow-2xl shadow-black/25">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8"><div className="mb-2 flex items-center gap-2 text-sm text-[#7cf7c5]"><ShieldCheck size={16}/> Live-evidence audit protocol</div><h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">An agent cannot grade its own work.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-[#9cb3aa]">Create a work order, submit the agent&apos;s delivery and sources, then let independent GenLayer validators produce a reusable onchain receipt.</p></div>
          <div className="px-6 pt-6 sm:px-8"><label htmlFor="contract" className="mb-2 block text-sm font-medium">Deployed PROOFCOURT contract</label><Input id="contract" value={contractAddress} onChange={(e) => setContractAddress(e.target.value.trim())} placeholder="0x…" className="h-12 border-white/10 bg-[#07100f] font-mono text-sm"/></div>
          <Tabs value={tab} onValueChange={setTab} className="p-6 sm:p-8"><TabsList className="grid h-12 w-full grid-cols-3 bg-[#07100f] p-1"><TabsTrigger value="order">1 · Work order</TabsTrigger><TabsTrigger value="delivery">2 · Delivery</TabsTrigger><TabsTrigger value="receipt">3 · Receipt</TabsTrigger></TabsList>
            <TabsContent value="order" className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Agent ID"><Input value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-11 border-white/10 bg-[#07100f]"/></Field><Field label="Assigned worker wallet"><Input value={worker} onChange={(e) => setWorker(e.target.value.trim())} placeholder="Connect wallet or paste address" className="h-11 border-white/10 bg-[#07100f] font-mono text-sm"/></Field></div><Field label="Work specification"><Textarea value={specification} onChange={(e) => setSpecification(e.target.value)} rows={5} className="resize-none border-white/10 bg-[#07100f] text-base leading-7"/></Field><Field label="Acceptance criteria">{criteria.map((criterion,index)=><div key={index} className="mb-2 flex gap-2"><Input aria-label={`Criterion ${index+1}`} value={criterion} onChange={(e)=>setCriteria((old)=>old.map((v,i)=>i===index?e.target.value:v))} className="h-11 border-white/10 bg-[#07100f]"/>{criteria.length>2&&<Button variant="ghost" size="icon" aria-label="Remove criterion" onClick={()=>setCriteria((old)=>old.filter((_,i)=>i!==index))}><X size={16}/></Button>}</div>)}{criteria.length<8&&<Button variant="outline" onClick={()=>setCriteria((old)=>[...old,""])} className="border-dashed border-white/15 bg-transparent"><Plus size={16}/>Add criterion</Button>}</Field><Button onClick={()=>guarded(createOrder)} disabled={!!busy||!account} className="h-12 w-full bg-[#7cf7c5] font-semibold text-[#07100f] hover:bg-[#a0ffd8]">{busy==="create"?<Loader2 className="animate-spin"/>:<FileCheck2/>}Create work order</Button></TabsContent>
            <TabsContent value="delivery" className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-[140px_1fr]"><Field label="Work order ID"><Input inputMode="numeric" value={workId} onChange={(e)=>setWorkId(e.target.value.replace(/\D/g,""))} className="h-11 border-white/10 bg-[#07100f]"/></Field><Field label="Agent delivery"><Textarea value={delivery} onChange={(e)=>setDelivery(e.target.value)} rows={6} className="resize-none border-white/10 bg-[#07100f] text-base leading-7"/></Field></div><Field label="Public evidence URLs">{sources.map((source,index)=><div key={index} className="mb-2 flex gap-2"><div className="relative flex-1"><Link2 className="absolute left-3 top-3.5 text-[#668078]" size={17}/><Input aria-label={`Source ${index+1}`} value={source} onChange={(e)=>setSources((old)=>old.map((v,i)=>i===index?e.target.value:v))} placeholder="https://…" className="h-11 border-white/10 bg-[#07100f] pl-10"/></div>{sources.length>1&&<Button variant="ghost" size="icon" aria-label="Remove source" onClick={()=>setSources((old)=>old.filter((_,i)=>i!==index))}><X size={16}/></Button>}</div>)}{sources.length<5&&<Button variant="outline" onClick={()=>setSources((old)=>[...old,""])} className="border-dashed border-white/15 bg-transparent"><Plus size={16}/>Add source</Button>}</Field><Button onClick={()=>guarded(submitDelivery)} disabled={!!busy||!account} className="h-12 w-full bg-[#7cf7c5] font-semibold text-[#07100f] hover:bg-[#a0ffd8]">{busy==="submit"?<Loader2 className="animate-spin"/>:<Bot/>}Submit agent delivery</Button></TabsContent>
            <TabsContent value="receipt" className="mt-6 space-y-5"><div className="flex gap-2"><Input aria-label="Receipt ID" inputMode="numeric" value={receiptId} onChange={(e)=>setReceiptId(e.target.value.replace(/\D/g,""))} className="h-11 border-white/10 bg-[#07100f]"/><Button variant="outline" onClick={()=>guarded(()=>loadReceipt())} disabled={!!busy||!validContract} className="h-11 border-white/15 bg-transparent"><Search size={16}/>Load receipt</Button></div><Button onClick={()=>guarded(evaluateReceipt)} disabled={!!busy||!account} className="h-12 w-full bg-[#7cf7c5] font-semibold text-[#07100f] hover:bg-[#a0ffd8]">{busy==="evaluate"?<Loader2 className="animate-spin"/>:<Gavel/>}Run Full Consensus audit</Button><p className="text-sm leading-6 text-[#819b92]">Validators independently retrieve every source, repeat the audit, and accept the receipt only when verdict, gap, evidence strength and criterion count agree.</p></TabsContent>
          </Tabs>
        </section>
        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-[#101c1a] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-[#89a59b]">Proof-of-Work Receipt</p><h2 className="mt-1 text-2xl font-semibold">#{receiptId}</h2></div><Badge className={`status-${tone}`}>{verdict}</Badge></div>{receipt ? <div className="mt-6 space-y-5"><div className="grid grid-cols-2 gap-3"><Metric label="Agent" value={work?.agent_id||"—"}/><Metric label="Work order" value={`#${Number(receipt.work_id??0)}`}/><Metric label="Score" value={`${Number(receipt.score??0)} / 100`}/><Metric label="Criteria" value={`${Number(receipt.criteria_met??0)} / ${Number(receipt.criteria_total??0)}`}/><Metric label="Evidence" value={receipt.evidence_strength||"—"}/><Metric label="Primary gap" value={(receipt.primary_gap||"—").replaceAll("_"," ")}/></div><div className="rounded-2xl border border-white/10 bg-[#07100f] p-4"><p className="text-xs uppercase tracking-[.13em] text-[#708980]">Consensus rationale</p><p className="mt-2 leading-7 text-[#d7e7e1]">{receipt.rationale||"This receipt has not been evaluated yet."}</p></div><div className="flex items-center gap-2 text-sm text-[#89a59b]"><Check size={16} className={receipt.status==="FINALIZED"?"text-[#7cf7c5]":""}/>Immutable historical receipt</div></div> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-5 py-9 text-center"><CircleAlert className="mx-auto text-[#627c73]"/><p className="mt-3 text-sm leading-6 text-[#89a59b]">Complete the workflow or load an existing receipt.</p></div>}</section>
          <section className="rounded-[24px] border border-white/10 bg-[#0c1715] p-6"><p className="text-xs uppercase tracking-[.14em] text-[#6e887f]">Protocol status</p><p aria-live="polite" className="mt-2 leading-6 text-[#d9e8e3]">{message}</p>{txHash&&<a className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#7cf7c5] hover:underline" href={`https://explorer-studio.genlayer.com/tx/${txHash}`} target="_blank" rel="noreferrer">Open transaction <ArrowUpRight size={14}/></a>}</section>
          <section className="grid grid-cols-3 gap-2 rounded-[24px] border border-white/10 bg-[#0c1715] p-4 text-center"><Step done={!!work} label="Order"/><Step done={!!receipt} label="Evidence"/><Step done={receipt?.status==="FINALIZED"} label="Finalized"/></section>
        </aside>
      </div>
      <footer className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 pb-8 text-sm text-[#718a81] lg:px-8"><p>Agent economy needs portable proof, not another self-report.</p><div className="flex gap-4">{validContract&&<a className="hover:text-[#7cf7c5]" href={`https://explorer-studio.genlayer.com/address/${contractAddress}`} target="_blank" rel="noreferrer">Contract</a>}<a className="hover:text-[#7cf7c5]" href="https://github.com/evrendag/proofcourt-genlayer" target="_blank" rel="noreferrer">Source</a></div></footer>
    </main>
  );
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <div><label className="mb-2 block text-sm font-medium">{label}</label>{children}</div>; }
function Metric({label,value}:{label:string;value:string}) { return <div className="rounded-2xl border border-white/10 bg-[#07100f] p-4"><p className="text-xs text-[#708980]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#e7f3ef]">{value}</p></div>; }
function Step({label,done}:{label:string;done?:boolean}) { return <div className={done?"text-[#7cf7c5]":"text-[#617970]"}><div className={`mx-auto mb-2 h-1.5 rounded-full ${done?"bg-[#7cf7c5]":"bg-white/10"}`}/><span className="text-xs">{label}</span></div>; }
