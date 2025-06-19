declare module 'react-qr-scanner' {
    import * as React from 'react';

    interface QrReaderProps {
        delay?: number;
        onError?: (error: any) => void;
        onScan?: (result: string | null) => void;
        style?: React.CSSProperties;
        constraints?: MediaTrackConstraints;
        facingMode?: 'user' | 'environment';
    }

    export default class QrScanner extends React.Component<QrReaderProps> { }
}
