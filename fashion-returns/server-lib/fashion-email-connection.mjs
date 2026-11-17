import {timingSafeEqual} from 'node:crypto';
import {resendConfigFromEnv,validateResendDestination} from './resend-email.mjs';
export function createConnectionService({env=process.env,fetchImpl=fetch}={}){
 const config=resendConfigFromEnv(env),phrase=env.LAB_ACCESS_KEY;
 const missing=()=>['RESEND_API_KEY','LAB_EMAIL_TO','LAB_ACCESS_KEY'].filter(k=>!env[k]);
 const ready=()=>validateResendDestination(config)&&typeof phrase==='string'&&phrase.length>=32&&phrase.length<=256;
 const publicStatus=()=>({state:ready()?'configured':'not_configured',configured:ready(),missing:missing(),sender:'onboarding@resend.dev',providerVerified:false,sendEnabled:false,message:ready()?'Server settings are present. Enter your lab access phrase to perform a read-only provider check. No email has been sent.':`Missing or invalid server settings: ${missing().length?missing().join(', '):'check RESEND_API_KEY, LAB_EMAIL_TO and LAB_ACCESS_KEY formats'}. No email has been sent.`});
 return {status:publicStatus,async inspect(body,authorization){
  if(!body||Object.keys(body).length!==1||body.operation!=='inspect')return {status:400,body:{state:'rejected',message:'Only the read-only inspect operation is available. Sending is not enabled.'}};
  if(!ready())return {status:503,body:publicStatus()};
  const supplied=typeof authorization==='string'&&authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(Buffer.byteLength(supplied)!==Buffer.byteLength(phrase)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(phrase)))return {status:401,body:{state:'unauthorized',message:'Enter the correct lab access phrase. No provider request was made.'}};
  try{
   const response=await fetchImpl('https://api.resend.com/domains',{method:'GET',headers:{Authorization:`Bearer ${config.apiKey}`,Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'error'});
   if(!response.ok)return {status:502,body:{state:'provider_rejected',providerHttpStatus:response.status,message:'Resend did not accept the read-only check. Check the key and Full access permission in your own server settings. No email was sent.'}};
   const result=await response.json();
   if(!Array.isArray(result.data))throw Error('Unexpected provider response');
   return {status:200,body:{state:'connection_verified',sender:'onboarding@resend.dev',permittedRecipient:config.to,checkedAt:new Date().toISOString(),providerVerified:true,sendEnabled:false,message:'Resend accepted a read-only API request. The permitted recipient is LAB_EMAIL_TO, which must match your Resend account address. Sending, email readback and inbox receipt are not yet tested. No email has been sent.'}};
  }catch{return {status:502,body:{state:'unavailable',message:'The read-only provider check could not be completed. No email was sent. Check the connection before trying again.'}};}
 }};
}
