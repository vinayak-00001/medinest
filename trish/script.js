const content = {
  photos: [
    {
      image: "assets/photos/photo-1.jpg",
      title: "A tiny favorite memory",
      caption:
        "The kind of moment that looked small from the outside, but felt huge to me because I was with you.",
    },
    {
      image: "assets/photos/photo-2.jpg",
      title: "The smile I carry around",
      caption:
        "You have this way of making an ordinary day feel softer, brighter, and somehow lighter all at once.",
    },
    {
      image: "assets/photos/photo-3.jpg",
      title: "Us, in the middle of life",
      caption:
        "I love the calm feeling of being next to you, like my heart finally knows where it wants to stay.",
    },
    {
      image: "assets/photos/photo-4.jpg",
      title: "One of my forever thoughts",
      caption:
        "Even after the day ends, little memories of you keep replaying in the sweetest way.",
    },
  ],
  notes: [
    {
      title: "You make things warmer",
      message:
        "Even when nothing special is happening, you somehow make life feel more beautiful just by being in it.",
    },
    {
      title: "I notice the little things",
      message:
        "The way you laugh, the way you care, the way you turn simple conversations into my favorite part of the day.",
    },
    {
      title: "Thank you for being you",
      message:
        "You are gentle where the world can feel rough, and I never want to stop appreciating that about you.",
    },
  ],
  finalMessage:
    "If you ever forget how loved you are, come back here and let me remind you: I would choose you in every soft, ordinary, beautiful version of life.",
};

const photoGrid = document.getElementById("photo-grid");
const notesGrid = document.getElementById("notes-grid");
const finalMessage = document.getElementById("final-message");
const surpriseButton = document.getElementById("surprise-button");
const surpriseMessage = document.getElementById("surprise-message");

function renderPhotos(items) {
  photoGrid.innerHTML = items
    .map((photo, index) => {
      const tilt = [-1.4, 1.1, -0.8, 1.5, -1.2, 0.9][index % 6];

      return `
        <article class="photo-card" style="--tilt:${tilt}deg">
          <div class="photo-frame">
            <img src="${photo.image}" alt="${photo.title}" loading="lazy" />
          </div>
          <div class="photo-caption">
            <h3 class="photo-title">${photo.title}</h3>
            <p class="photo-memory">${photo.caption}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderNotes(items) {
  notesGrid.innerHTML = items
    .map(
      (note) => `
        <article class="note-card">
          <h3>${note.title}</h3>
          <p>${note.message}</p>
        </article>
      `
    )
    .join("");
}

function setupReveal() {
  finalMessage.textContent = content.finalMessage;

  surpriseButton.addEventListener("click", () => {
    const isHidden = surpriseMessage.hasAttribute("hidden");

    if (isHidden) {
      surpriseMessage.removeAttribute("hidden");
      surpriseButton.textContent = "Hide the secret message";
      return;
    }

    surpriseMessage.setAttribute("hidden", "");
    surpriseButton.textContent = "Click for a secret message";
  });
}

function setupScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach((element) => {
    observer.observe(element);
  });
}

renderPhotos(content.photos);
renderNotes(content.notes);
setupReveal();
setupScrollAnimations();
