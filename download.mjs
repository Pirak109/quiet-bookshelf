// Keep the default driveItem response: projecting an instance annotation with
// $select can omit the download URL on OneDrive Personal.
export async function downloadBook(path,request,download=fetch){
  let item=await request(path);
  let url=item['@microsoft.graph.downloadUrl']||item['@content.downloadUrl'];
  if(!url){
    item=await request(path+'?$select=id,content.downloadUrl');
    url=item['@microsoft.graph.downloadUrl']||item['@content.downloadUrl'];
  }
  if(!url)throw Error('OneDriveから本文のダウンロードURLが返されませんでした。本棚を更新してもう一度開いてください。（本文取得 D01）');
  let target;
  try{target=new URL(url);}catch{throw Error('OneDriveから無効なダウンロードURLが返されました。（本文取得 D02）');}
  if(target.protocol!=='https:'||target.username||target.password)throw Error('OneDriveから無効なダウンロードURLが返されました。（本文取得 D02）');
  // These short-lived URLs are preauthenticated. Never forward the Graph token.
  let response;
  try{response=await download(url,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});}catch{throw Error('本文の通信に失敗しました。接続を確認して、もう一度開いてください。（本文取得 D03）');}
  if(!response.ok)throw Error(`本文を読み込めませんでした。もう一度本を開いてください。（本文取得 D04・${response.status}）`);
  return response.arrayBuffer();
}
