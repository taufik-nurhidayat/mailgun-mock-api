
let emailStorage = [];

// Helper function to extract email data from form data
function extractEmailData(formData) {
  return {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    from: formData.get("from"),
    to: formData.get("to"),
    cc: formData.get("cc"),
    bcc: formData.get("bcc"),
    subject: formData.get("subject"),
    text: formData.get("text"),
    html: formData.get("html"),
    attachmentNames: formData
      .getAll("attachment")
      .map((file) => (file instanceof File ? file.name : "Unknown")),
  };
}

// Helper function to serve HTML content
function serveHtml(content) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

// Helper function to generate the email list HTML
function generateEmailListHtml() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Mailgun Mock API - Email List</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 {
        color: #333;
      }
      .email-item {
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 15px;
        margin-bottom: 20px;
        background-color: #f9f9f9;
      }
      .email-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .email-meta {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
      }
      .email-subject {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 10px;
      }
      .email-recipients {
        margin-bottom: 10px;
      }
      .tabs {
        margin-bottom: 10px;
      }
      .tab-button {
        background-color: #e0e0e0;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        margin-right: 5px;
        border-radius: 4px 4px 0 0;
      }
      .tab-button.active {
        background-color: #fff;
        border-bottom: 1px solid #fff;
        position: relative;
        top: 1px;
      }
      .tab-content {
        border: 1px solid #ddd;
        padding: 10px;
        background-color: #fff;
        border-radius: 0 0 4px 4px;
      }
      .tab-pane {
        display: none;
      }
      .tab-pane.active {
        display: block;
      }
      .empty-state {
        text-align: center;
        padding: 40px;
        color: #666;
      }
      .refresh-button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <h1>Mailgun Mock API - Email List</h1>

    <button class="refresh-button" onclick="location.reload()">Refresh</button>

    ${
      emailStorage.length === 0
        ? '<div class="empty-state">No emails received yet. Send an email to this mock API to see it here.</div>'
        : emailStorage
            .map(
              (email) => `
        <div class="email-item">
          <div class="email-header">
            <div class="email-meta">ID: ${email.id} | ${new Date(email.timestamp).toLocaleString()}</div>
          </div>
          <div class="email-subject">${email.subject || "(No Subject)"}</div>
          <div class="email-recipients">
            <strong>From:</strong> ${email.from || "Not specified"}<br>
            <strong>To:</strong> ${email.to || "Not specified"}<br>
            ${email.cc ? `<strong>CC:</strong> ${email.cc}<br>` : ""}
            ${email.bcc ? `<strong>BCC:</strong> ${email.bcc}<br>` : ""}
            ${email.attachmentNames.length > 0 ? `<strong>Attachments:</strong> ${email.attachmentNames.join(", ")}<br>` : ""}
          </div>

          <div class="tabs">
            <button class="tab-button active" onclick="toggleTab('${email.id}', 'text')">Text</button>
            <button class="tab-button" onclick="toggleTab('${email.id}', 'html')">HTML</button>
          </div>

          <div class="tab-content">
            <div id="${email.id}-text" class="tab-pane active">
              <pre>${email.text || "(No text content)"}</pre>
            </div>
            <div id="${email.id}-html" class="tab-pane">
              ${
                email.html
                  ? `<iframe src="data:text/html;charset=utf-8,${encodeURIComponent(email.html)}" style="width: 100%; height: 300px; border: none;"></iframe>`
                  : "<div>(No HTML content)</div>"
              }
            </div>
          </div>
        </div>
      `,
            )
            .join("")
    }

    <script>
      function toggleTab(emailId, tabName) {
        // Get all tab buttons for this email
        const emailItem = document.getElementById(emailId + '-text').closest('.email-item');
        const tabButtons = emailItem.querySelectorAll('.tab-button');

        // Remove active class from all buttons and panes
        tabButtons.forEach(button => button.classList.remove('active'));
        emailItem.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to the clicked button and corresponding pane
        event.target.classList.add('active');
        document.getElementById(emailId + '-' + tabName).classList.add('active');
      }
    </script>
  </body>
  </html>
  `;
}

// Start the server
Bun.serve({
  port: 80,
  async fetch(req) {
    const url = new URL(req.url);

    // If requesting the root path, show the email list
    if (url.pathname === "/") {
      return serveHtml(generateEmailListHtml());
    }

    // Handle Mailgun API endpoint
    if (url.pathname.endsWith("/messages")) {
      try {
        const formData = await req.formData();
        const emailData = extractEmailData(formData);

        // Save the email data
        emailStorage.unshift(emailData);

        console.log("Email received:", emailData);

        // Return a mock Mailgun response
        return Response.json({
          id: emailData.id,
          message: "Queued. Thank you.",
        });
      } catch (error) {
        console.error("Error processing email:", error);
        return new Response("Error processing email", { status: 500 });
      }
    }

    // Handle clear endpoint to reset the storage
    if (url.pathname === "/clear") {
      emailStorage = [];
      return Response.redirect("http://localhost/", 302);
    }

    // 404 for other paths
    return new Response("Not found", { status: 404 });
  },
});

console.log("Mailgun Mock API running on http://localhost:80");
console.log("View emails at: http://localhost:8181/");
console.log("Mailgun endpoint: http://localhost:8181/messages");
console.log("Clear all emails: http://localhost:8181/clear");
