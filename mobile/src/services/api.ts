import AsyncStorage from '@react-native-async-storage/async-storage';
export const API=(process.env.EXPO_PUBLIC_API_URL||'http://localhost:5000/api');
export async function request(path:string,options:any={}){const token=await AsyncStorage.getItem('mitme_access');const res=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(options.headers||{})}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||'Request failed');return data;}
export const saveTokens=async(a:string,r:string)=>{await AsyncStorage.multiSet([['mitme_access',a],['mitme_refresh',r]])};export const clearTokens=()=>AsyncStorage.multiRemove(['mitme_access','mitme_refresh']);
