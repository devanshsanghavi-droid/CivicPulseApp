// src/components/SplineBackground.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export function SplineBackground() {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; }
        body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
        canvas { width: 100% !important; height: 100% !important; }
      </style>
    </head>
    <body>
      <script type="module">
        import { Application } from 'https://unpkg.com/@splinetool/runtime@1.0.0/build/runtime.js';
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const app = new Application(canvas);
        app.load('https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode');
      </script>
    </body>
    </html>
  `;

    return (
        <View style={styles.container}>
            <WebView
                source={{ html }}
                style={styles.webview}
                scrollEnabled={false}
                bounces={false}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
