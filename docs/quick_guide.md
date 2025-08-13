\# Quick Introduction to VS Code Extensions



Here's a quick breakdown of VS Code Extension architecture: the key core concept is that VS Code extensions have \*\*two separate worlds\*\*:



\## 1. Extension Host (Node.js side)

\- \*\*Your `extension.ts` file\*\*

\- Handles VS Code integration (commands, menus, file access)

\- Cannot directly manipulate UI

\- Communicates with VS Code APIs



\## 2. Webview (Browser side) 

\- \*\*Your `media/main.js` file\*\*

\- Handles user interface and visualization

\- Runs Three.js and WebGL

\- Cannot access file system directly



\## The Bridge: Message Passing

They communicate through a message-passing system:

\- Extension sends data → Webview

\- Webview sends requests → Extension



\## In this Wavefront Visualization Extension:



* \*\*package.json\*\* = "What does this extension do?" (manifest)
* \*\*extension.ts\*\* = "Handle VS Code stuff" (backend)
* \*\*wavefrontPanel.ts\*\* = "Manage the 3D viewer window" (UI manager)
* \*\*main.js\*\* = "Draw the 3D visualization" (frontend)



Think of it like a web app:

\- \*\*Extension = Server\*\* (handles file I/O, VS Code integration)

\- \*\*Webview = Client\*\* (handles user interface, visualization)

\- \*\*Messages = HTTP requests\*\* (communication between them)



The security model is strict - the webview can't directly access files or VS Code APIs, so everything goes through the extension host. This is why we need the message-passing system to send the JSON data from the extension to the Three.js visualization.



This separation keeps extensions secure while allowing rich UI capabilities through standard web technologies.

