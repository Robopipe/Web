## What computer vision is

Computer vision is the field of artificial intelligence that extracts information from images. A camera supplies the image and a model tells you what is in it, where it is and how many there are. When the same technique runs on a production line, it is called [machine vision](/en/machine-vision).

## What computer vision can do

- **Classification.** The model puts the whole image into a category, for example OK or NOK. This is also how Robopipe recognises a product in a photo and fills in its catalogue data.
- **Object detection.** The model finds individual objects in the image and marks each one with a box. This is how defects, foreign objects or missing ingredients are found.
- **Counting.** From detection it is a short step to a piece count. This is how Robopipe checks that every jar holds the right number of capsules.

Specific checks are built from these tasks. On one baguette at Crocodille, Robopipe runs 19 of them.

## Where computer vision is used in industry

- **Food processing:** missing, misplaced or swapped ingredients, foreign objects, portion and fill checks.
- **Pharma and healthcare:** fill level, capsule and blister completeness, caps, seals and closures, labels and lot code legibility. Every check leaves an image record for audits.
- **Retail and e-commerce:** tagging product photos and listing new products from a photo.
- **Logistics:** forklift and pedestrian near misses, missing protective equipment, blocked emergency exits and obstacles in aisles.

## How Robopipe deploys computer vision

Robopipe puts the whole process into one pipeline: capture, label, train and evaluate. A sealed camera captures on the line, you label images in the Studio app and the model runs on the AI PLC controller right at the line.

The whole pipeline is open. You can read the configurations, export the datasets and take your models with you. Robopipe is also open source, so you can run it on your own infrastructure. It even runs on a Raspberry Pi.

The pages [AI quality inspection](/en/ai-quality-inspection) and [camera quality inspection](/en/camera-quality-inspection) show how computer vision becomes quality inspection on your line.
