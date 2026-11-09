import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { FileText, Upload, Search, Download, Trash2, RefreshCw, FolderOpen, AlertTriangle } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type DocumentRow = Tables<'factory_documents'>
type Props = { organizationId: string; factoryId: string }
const BUCKET='factory-documents'
const categories=['General','Licence & compliance','GST & tax','Machinery manual','Purchase & supplier','Quality certificate','Employee records','Insurance','Finance & accounts','Other']
const today=()=>new Date().toLocaleDateString('en-CA')
const prettySize=(bytes:number)=>bytes>=1048576?(bytes/1048576).toFixed(2)+' MB':(bytes/1024).toFixed(1)+' KB'
const expiryState=(date:string|null)=>{if(!date)return 'No expiry';const days=Math.ceil((new Date(date+'T00:00:00').getTime()-new Date(today()+'T00:00:00').getTime())/86400000);return days<0?'Expired':days<=30?'Expiring soon':'Valid'}
const safeName=(name:string)=>name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^\.+/,'').slice(-120)||'document'

export default function DocumentManagement({organizationId,factoryId}:Props){
 const [documents,setDocuments]=useState<DocumentRow[]>([])
 const [query,setQuery]=useState('')
 const [category,setCategory]=useState('All')
 const [formOpen,setFormOpen]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [downloading,setDownloading]=useState<string|null>(null)
 const [file,setFile]=useState<File|null>(null)
 const [form,setForm]=useState({document_title:'',document_category:'General',document_number:'',issue_date:'',expiry_date:'',notes:''})
 async function load(){
  if(!supabase||!organizationId||!factoryId)return
  const {data,error:e}=await supabase.from('factory_documents').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('created_at',{ascending:false})
  if(e)throw e;setDocuments(data??[])
 }
 useEffect(()=>{let alive=true;load().catch(e=>{if(alive)setError(e instanceof Error?e.message:'Unable to load documents.')});return()=>{alive=false}},[organizationId,factoryId])
 const visible=useMemo(()=>documents.filter(d=>(category==='All'||d.document_category===category)&&[d.document_title,d.document_number??'',d.original_file_name,d.document_category].join(' ').toLowerCase().includes(query.toLowerCase())),[documents,category,query])
 const expired=documents.filter(d=>expiryState(d.expiry_date)==='Expired').length
 const expiring=documents.filter(d=>expiryState(d.expiry_date)==='Expiring soon').length
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||!file)return
  if(file.size>20*1024*1024){setError('File exceeds the 20 MB upload limit.');return}
  setBusy(true);setError('');setNotice('')
  const path=organizationId+'/'+factoryId+'/'+crypto.randomUUID()+'-'+safeName(file.name)
  try{
   const {error:upError}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false})
   if(upError)throw upError
   const {error:dbError}=await supabase.from('factory_documents').insert({organization_id:organizationId,factory_id:factoryId,document_title:form.document_title.trim(),document_category:form.document_category,document_number:form.document_number.trim()||null,issue_date:form.issue_date||null,expiry_date:form.expiry_date||null,storage_path:path,original_file_name:file.name,mime_type:file.type||'application/octet-stream',file_size_bytes:file.size,notes:form.notes.trim()||null})
   if(dbError){await supabase.storage.from(BUCKET).remove([path]);throw dbError}
   setForm({document_title:'',document_category:'General',document_number:'',issue_date:'',expiry_date:'',notes:''});setFile(null);setFormOpen(false);await load();setNotice('Document uploaded successfully.')
  }catch(e){setError(e instanceof Error?e.message:'Document upload failed.')}
  finally{setBusy(false)}
 }
 async function download(doc:DocumentRow){
  if(!supabase)return;setDownloading(doc.id);setError('')
  try{const {data,error:e}=await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path,60);if(e)throw e;window.open(data.signedUrl,'_blank','noopener,noreferrer')}
  catch(e){setError(e instanceof Error?e.message:'Could not open document.')}finally{setDownloading(null)}
 }
 async function remove(doc:DocumentRow){
  if(!supabase||!window.confirm('Delete '+doc.document_title+'? This will permanently remove the stored file.'))return
  setError('');setNotice('')
  const {error:e}=await supabase.storage.from(BUCKET).remove([doc.storage_path])
  if(e){setError(e.message);return}
  const {error:dbError}=await supabase.from('factory_documents').delete().eq('id',doc.id).eq('organization_id',organizationId).eq('factory_id',factoryId)
  if(dbError){setError(dbError.message);return}
  await load();setNotice('Document deleted.')
 }
 return <section className="panel data-panel documents-management">
  <div className="section-heading"><div><h2>Document management</h2><p>Secure factory files, certificates, licences, manuals and expiry tracking</p></div><button className="primary-btn" onClick={()=>{setFormOpen(!formOpen);setError('')}}><Upload size={16}/> Upload document</button></div>
  <div className="expense-summary documents-summary"><div><span>Total documents</span><strong>{documents.length}</strong></div><div><span>Expiring in 30 days</span><strong>{expiring}</strong></div><div><span>Expired documents</span><strong>{expired}</strong></div></div>
  {formOpen&&<form className="record-form documents-form" onSubmit={upload}><h3>Upload factory document</h3>
   <label>Document title *<input required value={form.document_title} onChange={e=>setForm({...form,document_title:e.target.value})} placeholder="e.g. Factory licence"/></label>
   <label>Category<select value={form.document_category} onChange={e=>setForm({...form,document_category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
   <label>Document number<input value={form.document_number} onChange={e=>setForm({...form,document_number:e.target.value})}/></label>
   <label>Issue date<input type="date" value={form.issue_date} onChange={e=>setForm({...form,issue_date:e.target.value})}/></label>
   <label>Expiry date<input type="date" value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})}/></label>
   <label className="wide-field">Choose file *<input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt" onChange={e=>setFile(e.target.files?.[0]??null)}/><small>PDF, images, Word, Excel or TXT · Maximum 20 MB</small></label>
   <label className="wide-field">Notes<textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
   <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy||!file}>{busy?'Uploading…':'Save document'}</button><button className="secondary-btn" type="button" onClick={()=>setFormOpen(false)}>Cancel</button></div>
  </form>}
  {error&&<p className="form-message error-message" role="alert">{error}</p>}{notice&&<p className="form-success" role="status">{notice}</p>}
  <div className="documents-toolbar"><label className="documents-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, number or file name"/></label><select aria-label="Filter by document category" value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{categories.map(c=><option key={c}>{c}</option>)}</select><button className="secondary-btn" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={15}/> Refresh</button></div>
  <div className="table-scroll"><table className="records-table documents-table"><thead><tr><th>Document</th><th>Category</th><th>Document no.</th><th>Issue date</th><th>Expiry date</th><th>File size</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(d=>{const state=expiryState(d.expiry_date);return <tr key={d.id}><td><div className="document-name"><FileText size={18}/><div><strong>{d.document_title}</strong><small>{d.original_file_name}</small></div></div></td><td>{d.document_category}</td><td>{d.document_number||'—'}</td><td>{d.issue_date||'—'}</td><td>{d.expiry_date||'—'}</td><td>{prettySize(d.file_size_bytes)}</td><td><span className={'document-status '+(state==='Expired'?'document-expired':state==='Expiring soon'?'document-warning':'document-valid')}>{state==='Expired'||state==='Expiring soon'?<AlertTriangle size={12}/>:null}{state}</span></td><td><div className="document-actions"><button className="icon-btn" aria-label={'Download '+d.document_title} title="Download" disabled={downloading===d.id} onClick={()=>download(d)}><Download size={16}/></button><button className="icon-btn danger-btn" aria-label={'Delete '+d.document_title} title="Delete" onClick={()=>remove(d)}><Trash2 size={16}/></button></div></td></tr>})}</tbody></table>
   {!visible.length&&<div className="empty-state"><FolderOpen size={26}/><strong>No documents found</strong><span>Upload your first factory document or change the search filter.</span></div>}
  </div>
  <p className="report-footnote"><FileText size={14}/> Files are stored in a private bucket. Access is restricted to authenticated members of the relevant organization and factory.</p>
 </section>
}
