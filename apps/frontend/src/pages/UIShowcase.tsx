import { useState } from 'react';
import { Button, Card, CardHeader, CardBody, CardFooter, Badge, Input, Modal, LoadingSpinner, EmptyState, SkeletonLoader } from '../components/ui';

export default function UIShowcase() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
            UI Component <span className="gradient-text">Showcase</span>
          </h1>
          <p className="text-lg text-gray-600">
            A comprehensive collection of modern, reusable UI components
          </p>
        </div>

        <div className="space-y-12">
          {/* Buttons Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Buttons</h2>
            <Card>
              <CardBody>
                <div className="space-y-6">
                  {/* Variants */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Variants</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary">Primary</Button>
                      <Button variant="ocean">Ocean</Button>
                      <Button variant="success">Success</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="danger">Danger</Button>
                    </div>
                  </div>

                  {/* Sizes */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Sizes</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="primary" size="sm">Small</Button>
                      <Button variant="primary" size="md">Medium</Button>
                      <Button variant="primary" size="lg">Large</Button>
                    </div>
                  </div>

                  {/* States */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">States</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary" loading>Loading</Button>
                      <Button variant="primary" disabled>Disabled</Button>
                      <Button variant="primary" icon={<span>✓</span>}>With Icon</Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* Cards Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardBody>
                  <h3 className="font-bold text-gray-900 mb-2">Basic Card</h3>
                  <p className="text-sm text-gray-600">Simple card with content</p>
                </CardBody>
              </Card>

              <Card hover>
                <CardBody>
                  <h3 className="font-bold text-gray-900 mb-2">Hover Card</h3>
                  <p className="text-sm text-gray-600">Lifts on hover</p>
                </CardBody>
              </Card>

              <Card interactive>
                <CardBody>
                  <h3 className="font-bold text-gray-900 mb-2">Interactive Card</h3>
                  <p className="text-sm text-gray-600">Clickable with border highlight</p>
                </CardBody>
              </Card>

              <Card gradient>
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Card with Header</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-gray-600">Card with gradient accent</p>
                </CardBody>
                <CardFooter>
                  <Button variant="primary" size="sm">Action</Button>
                </CardFooter>
              </Card>
            </div>
          </section>

          {/* Badges Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Badges</h2>
            <Card>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Role Badges</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="player">Player</Badge>
                      <Badge variant="team">Team</Badge>
                      <Badge variant="org">Organization</Badge>
                      <Badge variant="admin">Admin</Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Semantic Badges</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">Success</Badge>
                      <Badge variant="warning">Warning</Badge>
                      <Badge variant="error">Error</Badge>
                      <Badge variant="default">Default</Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">With Icons</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success" icon={<span>✓</span>}>Active</Badge>
                      <Badge variant="warning" icon={<span>⚠</span>}>Pending</Badge>
                      <Badge variant="error" icon={<span>✕</span>}>Inactive</Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Sizes</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="player" size="sm">Small</Badge>
                      <Badge variant="player" size="md">Medium</Badge>
                      <Badge variant="player" size="lg">Large</Badge>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* Inputs Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Form Inputs</h2>
            <Card>
              <CardBody>
                <div className="space-y-4 max-w-md">
                  <Input
                    label="Basic Input"
                    placeholder="Enter text"
                  />
                  
                  <Input
                    label="Required Input"
                    placeholder="Required field"
                    required
                  />
                  
                  <Input
                    label="Input with Error"
                    placeholder="Invalid input"
                    error="This field is required"
                  />
                  
                  <Input
                    label="Input with Helper"
                    placeholder="Enter email"
                    helperText="We'll never share your email"
                  />
                  
                  <Input
                    label="Disabled Input"
                    placeholder="Disabled"
                    disabled
                    value="Cannot edit"
                  />
                </div>
              </CardBody>
            </Card>
          </section>

          {/* Loading States Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Loading States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Spinners</h3>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <LoadingSpinner size="sm" color="primary" />
                      <p className="text-xs text-gray-500 mt-2">Small</p>
                    </div>
                    <div className="text-center">
                      <LoadingSpinner size="md" color="ocean" />
                      <p className="text-xs text-gray-500 mt-2">Medium</p>
                    </div>
                    <div className="text-center">
                      <LoadingSpinner size="lg" color="primary" />
                      <p className="text-xs text-gray-500 mt-2">Large</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Skeleton Loaders</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    <SkeletonLoader type="title" />
                    <SkeletonLoader type="text" count={3} />
                  </div>
                </CardBody>
              </Card>
            </div>
          </section>

          {/* Modal Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Modal</h2>
            <Card>
              <CardBody>
                <Button variant="primary" onClick={() => setModalOpen(true)}>
                  Open Modal
                </Button>
              </CardBody>
            </Card>

            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Example Modal"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setModalOpen(false)}>
                    Confirm
                  </Button>
                </>
              }
            >
              <p className="text-gray-600">
                This is an example modal dialog. It includes a backdrop blur effect,
                smooth animations, and keyboard support (press ESC to close).
              </p>
            </Modal>
          </section>

          {/* Empty State Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Empty State</h2>
            <Card>
              <CardBody>
                <EmptyState
                  icon="📭"
                  title="No items found"
                  description="Try adjusting your search criteria or add a new item"
                  action={{
                    label: "Add Item",
                    onClick: () => alert('Add item clicked')
                  }}
                />
              </CardBody>
            </Card>
          </section>

          {/* Utility Classes Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Utility Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Gradient Text</h3>
                </CardHeader>
                <CardBody>
                  <h2 className="text-3xl font-black gradient-text mb-2">Primary Gradient</h2>
                  <h2 className="text-3xl font-black gradient-text-gold mb-2">Gold Gradient</h2>
                  <h2 className="text-3xl font-black gradient-text-success">Success Gradient</h2>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Glass Effects</h3>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div className="glass p-4 rounded-xl">
                    <p className="text-white">Glass Effect</p>
                  </div>
                  <div className="glass-white p-4 rounded-xl">
                    <p className="text-gray-900">White Glass</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </section>

          {/* Animations Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Animations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="animate-fade-in-up">
                <CardBody className="text-center">
                  <div className="text-4xl mb-2">↑</div>
                  <p className="text-sm font-semibold">Fade In Up</p>
                </CardBody>
              </Card>

              <Card className="animate-slide-in-left animate-delay-200">
                <CardBody className="text-center">
                  <div className="text-4xl mb-2">←</div>
                  <p className="text-sm font-semibold">Slide In Left</p>
                </CardBody>
              </Card>

              <Card className="animate-scale-in animate-delay-400">
                <CardBody className="text-center">
                  <div className="text-4xl mb-2">⚡</div>
                  <p className="text-sm font-semibold">Scale In</p>
                </CardBody>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
