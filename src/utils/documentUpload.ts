export async function validateDocumentUpload(file: Blob) {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) {
        throw new Error('Choose a PDF, JPEG or PNG file up to 10 MB.');
      }
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const valid = file.type === 'application/pdf' ? String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-' :
        file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
        [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
      if (!valid) throw new Error('The file contents do not match its type.');
}
