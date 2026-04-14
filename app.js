// Show today's date
const today = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('today-date').textContent = today.toLocaleDateString('en-PH', options);

// Placeholder stats (we will connect real data later)
document.getElementById('checkins-today').textContent = 0;
document.getElementById('revenue-today').textContent = '₱ 0';
document.getElementById('active-members').textContent = 0;
document.getElementById('total-members').textContent = 0;

// Search function (we will build this out later)
function searchMember() {
  const query = document.getElementById('search-input').value;
  if (query.trim() === '') {
    alert('Please enter a name to search.');
    return;
  }
  alert('Searching for: ' + query);
}