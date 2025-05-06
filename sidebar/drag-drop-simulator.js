// Create a File with Markdown and dispatch drag/drop events
function simulateDropWithMarkdown(markdown, title) {
  console.log("Creating File object with Markdown...");
  const blob = new Blob([markdown], { type: "text/markdown" });

  // Clean the title and ensure it ends with .md
  const cleanTitle =
    (title || "page")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .substring(0, 50) + // Limit length
    ".md";

  const file = new File([blob], cleanTitle, { type: "text/markdown" });

  console.log("Creating DataTransfer object...");
  const dt = new DataTransfer();
  dt.items.add(file);

  console.log("Simulating drag and drop events...");
  // Common event properties for drag events
  const eventOptions = { dataTransfer: dt, bubbles: true, cancelable: true };

  // Dispatch each event in sequence
  console.log("Dispatching dragenter event...");
  const dragEnterEvent = new DragEvent("dragenter", eventOptions);
  const dragEnterResult = document.body.dispatchEvent(dragEnterEvent);
  console.log(`dragenter dispatch result: ${dragEnterResult}`);

  console.log("Dispatching dragover event...");
  const dragOverEvent = new DragEvent("dragover", eventOptions);
  const dragOverResult = document.body.dispatchEvent(dragOverEvent);
  console.log(`dragover dispatch result: ${dragOverResult}`);

  console.log("Dispatching drop event...");
  const dropEvent = new DragEvent("drop", eventOptions);
  const dropResult = document.body.dispatchEvent(dropEvent);
  console.log(`drop dispatch result: ${dropResult}`);

  console.log("Drop simulation completed!");
}
