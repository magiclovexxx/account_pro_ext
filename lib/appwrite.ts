import { Client, Account, Databases } from 'appwrite';

export const appwriteEndpoint = 'https://host-appwrite.kingoftool.net/v1';
export const appwriteProjectId = '68f925ba0017199b6c35';
export const appwriteDatabaseId = 'accountPro';
export const ordersCollectionId = 'orders'; // Giả định tên collection là 'orders'
export const toolsCollectionId = 'tools'; // Giả định collection chứa thông tin tool
export const listToolCollectionId = 'listTool'; // Collection cho danh sách tool bán

const client = new Client();

client
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProjectId);

export const account = new Account(client);
export const databases = new Databases(client);

export default client;