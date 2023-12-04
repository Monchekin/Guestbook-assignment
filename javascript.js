document.addEventListener('DOMContentLoaded', function() {
  var topicDiv = document.getElementById('topicDiv');
  var guestListDiv = document.getElementById('guestList');

  headlinesData.forEach(function(thread) {
    var topicTitle = document.createElement('h3');
    topicTitle.textContent = topic.headline;
    topicTitle.setAttribute('data-topic-id', topic.id);

    topicTitle.addEventListener('click', function() {
      guestListDiv.innerHTML = '<h2>' + topic.headline + '</h2><p>' + topic.content + '</p>';
    });

    topicDiv.appendChild(topicTitle);
  });
});