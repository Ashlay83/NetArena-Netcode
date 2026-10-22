export interface Transport {
    send(data:string|ArrayBuffer): void;
    onMessage(handler:(data:string|ArrayBuffer)=>void):void;
    onDisconnect(handler:()=>void): void;
    disconnect():void;

}

export class SimulatedLinkTransport implements Transport{
    private baseTransport: Transport;
    private latencyMs: number;
    private packetLossRatio: number;

    private messageHandlers:((data:string|ArrayBuffer)=>void)[]=[];

    constructor(baseTransport: Transport,latencyMs=150, packetLossRatio=0.05){
        this.baseTransport= baseTransport;
        this.latencyMs= latencyMs;
        this.packetLossRatio= packetLossRatio;

        this.baseTransport.onMessage((data)=>{
            this.simulateReceive(data);
        });
    }

    send(data: string|ArrayBuffer):void {
        const randomNumber: number = Math.random();
        if(randomNumber < this.packetLossRatio){
            return; 
        }
        else{
            setTimeout(() => {
                this.baseTransport.send(data);
            }, this.latencyMs);
        }

    }

    private simulateReceive(data: string|ArrayBuffer): void {
        const randomNumber: number = Math.random();
        if(randomNumber < this.packetLossRatio){
            return 
        }
        else{
            setTimeout(() => {
                for(const handler of this.messageHandlers){
                    handler(data);
                }
            }, this.latencyMs);
        }

    }

  onMessage(handler: (data: string | ArrayBuffer) => void): void {
    this.messageHandlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.baseTransport.onDisconnect(handler);
  }

  disconnect(): void {
    this.baseTransport.disconnect();
  }
}

export class WebSocketTransport implements Transport {
    private socket:any;
    private messageHandlers:((data:string|ArrayBuffer)=>void)[]=[];
    private disconnectHandlers:(()=>void)[]=[];

    constructor(socket:any){
        this.socket=socket;

        this.socket.onmessage =(event:any)=>{
            for(const handler of this.messageHandlers){
                handler(event.data);
            }
        };

        this.socket.onclose=()=>{
            for(const handler of this.disconnectHandlers){
                handler();
            }
        };

        
    }

    send(data:string|ArrayBuffer):void{
        if(this.socket.readyState===1){
            this.socket.send(data);
        }
    }

    onMessage(handler: (data: string | ArrayBuffer) => void): void {
        this.messageHandlers.push(handler);

    }

    onDisconnect(handler: () => void): void {
        this.disconnectHandlers.push(handler);

    }

    disconnect(): void {
        this.socket.close();
    }

}