## What defects the camera finds

Camera defect detection watches for what a person at the belt would otherwise have to see. The camera takes an image of every piece and the model decides whether the piece matches a good sample. Typical tasks from sites where Robopipe runs:

- **Surface inspection.** The camera sees when the surface of a product does not match a good piece.
- **Shape and look of the product.** Missing, misplaced or swapped ingredients on an assembled product.
- **Foreign object in the pack.** Nothing that does not belong there may get into the pack.
- **Seal integrity.** The camera checks the seal of every pack.

## How camera defect detection works

A deep-learning model decides about every piece. The model learns from images of your good and defective pieces. Nobody writes rules for each defect. When a new kind of defect appears, you add images and retrain the model.

Defect detection is part of machine vision. The [guide to machine vision](/en/blog/what-is-a-vision-system-a-plain-english-guide-to-machine-vision-in-manufacturing) explains what that means and how it differs from computer vision. The [camera quality inspection](/en/camera-quality-inspection) page describes the camera, the control unit and the rollout.

## What happens to a defective piece

Operators see the verdict for every piece on a display on the floor. The control unit can trigger your existing reject unit or signal light, so the defective piece leaves the line at once. An image of every piece stays in the archive, so you can trace a defect later.

Production managers follow the most common defects and the share of OK pieces in the analytics portal. The article [Cut reject rates without slowing production](/en/blog/cut-reject-rates) shows how live inspection helps.

When the defect is a missing or extra part in the pack, it is a task for [packaging completeness inspection](/en/packaging-completeness-inspection).
