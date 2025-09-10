export function disablePasting() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                alert('Paste disabled!');
            }
        });
        document.addEventListener('paste', (e) => {
            e.preventDefault();
            alert('Paste disabled!');
        });
    }