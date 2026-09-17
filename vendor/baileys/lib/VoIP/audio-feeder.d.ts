export declare class AudioFeeder {
    #private;
    private readonly sampleRate;
    private readonly channels;
    private readonly framesPerChunk;
    private readonly onChunk;
    private readonly source;
    droppedChunks: number;
    underflowChunks: number;
    bytesProduced: number;
    chunksEmitted: number;
    constructor(sampleRate: number, channels: number, framesPerChunk: number, onChunk: (chunk: Float32Array) => void, source?: string);
    start: () => void;
    stop: () => void;
}
