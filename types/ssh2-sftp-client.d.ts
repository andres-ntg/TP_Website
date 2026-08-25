declare module "ssh2-sftp-client" {
  type ConnectOptions = {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };

  class SftpClient {
    connect(options: ConnectOptions): Promise<void>;
    put(input: Buffer, remotePath: string): Promise<void>;
    delete(remotePath: string): Promise<void>;
    end(): Promise<void>;
  }

  export = SftpClient;
}
