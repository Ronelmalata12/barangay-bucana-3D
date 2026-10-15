/** Readable sample records opened from physical files inside cabinets. */
export function createRecordsViewer({onOpen = () => {}, onClose = () => {}}) {
  const dialog = document.querySelector('#records-dialog');
  document.querySelector('#records-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',onClose);
  return {
    open(record) {
      document.querySelector('#record-title').textContent = record.title;
      document.querySelector('#record-reference').textContent = record.reference;
      const fields = document.querySelector('#record-fields');
      fields.replaceChildren();
      for(const [name,value] of record.entries) {
        const term = document.createElement('dt'), detail = document.createElement('dd');
        term.textContent = name;
        detail.textContent = value;
        fields.append(term,detail);
      }
      onOpen();
      if(!dialog.open) dialog.showModal();
    },
    close() { if(dialog.open) dialog.close(); },
  };
}
