"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, NodeTypes, EdgeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Save, Play, Plus, Trash2, Settings, MessageSquare, Phone, Bot, Database, ArrowRight, X, Copy, Edit, Clock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const nodeTypes: NodeTypes = {};
const edgeTypes: EdgeTypes = {};

const FlowBuilder = ({ automationId }: { automationId: number }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: automationData, isLoading } = useQuery({
    queryKey: ['automation', automationId],
    queryFn: async () => {
      const response = await fetch(`/api/automations/${automationId}`);
      if (!response.ok) throw new Error('Failed to fetch automation');
      return response.json();
    },
  });

  useEffect(() => {
    if (automationData) {
      setFlowName(automationData.name);
      setFlowDescription(automationData.description || '');
      setIsPublished(automationData.status === 'published');

      const flowNodes: Node[] = (automationData.nodes as any[]).map((node: any) => ({
        id: node.id.toString(),
        type: node.type,
        position: { x: node.positionX || 0, y: node.positionY || 0 },
        data: { ...node.data, label: node.data?.label || `Node ${node.id}` },
      }));

      const flowEdges: Edge[] = (automationData.edges as any[]).map((edge: any) => ({
        id: edge.id.toString(),
        source: edge.sourceNodeId.toString(),
        target: edge.targetNodeId.toString(),
        type: edge.type || 'default',
        animated: edge.animated || false,
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [automationData, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}`,
        type: 'button',
        animated: true,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 250, y: 250 },
      data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node` },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const deleteEdge = (id: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const updateNodeData = (id: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, ...data };
        }
        return node;
      })
    );
    if (selectedNode?.id === id) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } });
    }
  };

  const saveAutomation = async () => {
    if (!flowName.trim()) {
      toast({
        title: 'Error',
        description: 'Flow name is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const flowData = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          positionX: n.position.x,
          positionY: n.position.y,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          type: e.type,
          animated: e.animated,
        })),
      };

      const response = await fetch(`/api/automations/${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          description: flowDescription,
          status: isPublished ? 'published' : 'draft',
          nodes: flowData.nodes,
          edges: flowData.edges,
        }),
      });

      if (!response.ok) throw new Error('Failed to save automation');

      toast({
        title: 'Success',
        description: 'Automation saved successfully.',
      });

      queryClient.invalidateQueries({ queryKey: ['automation', automationId] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save automation.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const publishAutomation = async () => {
    setIsPublished(true);
    await saveAutomation();
  };

  const unpublishAutomation = async () => {
    setIsPublished(false);
    await saveAutomation();
  };

  const duplicateNode = (node: Node) => {
    const duplicated: Node = {
      ...node,
      id: `${node.id}-copy-${Date.now()}`,
      position: { x: node.position.x + 100, y: node.position.y + 100 },
    };
    setNodes((nds) => nds.concat(duplicated));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading automation...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-muted/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Flow Builder</h1>
            <Badge variant={isPublished ? 'default' : 'secondary'}>
              {isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={saveAutomation} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {!isPublished ? (
              <Button size="sm" onClick={publishAutomation}>
                <Play className="h-4 w-4 mr-2" />
                Publish
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={unpublishAutomation}>
                Unpublish
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-background flex flex-col">
          <Tabs defaultValue="design" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="flex-1 flex flex-col p-4 space-y-4">
              <div>
                <Label>Flow Name</Label>
                <Input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Enter flow name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={flowDescription}
                  onChange={(e) => setFlowDescription(e.target.value)}
                  placeholder="Describe this automation flow"
                  rows={3}
                />
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Nodes</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => addNode('start')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => addNode('message')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => addNode('ai')}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AI Response
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => addNode('condition')}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Condition
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => addNode('tag')}
                  >
                    <Badge className="h-4 w-4 mr-2" />
                    Add Tag
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => addNode('wait')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Wait
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="settings" className="flex-1 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Settings</CardTitle>
                  <CardDescription>Configure general settings for this flow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Published</Label>
                      <p className="text-sm text-muted-foreground">This flow is live and processing messages.</p>
                    </div>
                    <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button variant="outline" size="sm" onClick={saveAutomation} disabled={isSaving}>
                    Save Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 relative">
          <div ref={reactFlowWrapper} className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
              onInit={setReactFlowInstance}
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </div>

        {selectedNode && (
          <div className="w-80 border-l bg-background flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Node Settings</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={(selectedNode.data.label as string) || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  />
                </div>

                {selectedNode.type === 'start' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Trigger Type</Label>
                      <Select
                        value={(selectedNode.data as any).triggerType || 'exact_match'}
                        onValueChange={(value) => updateNodeData(selectedNode.id, { triggerType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exact_match">Exact Match</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="first_message">First Message</SelectItem>
                          <SelectItem value="fallback">Fallback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(selectedNode.data as any).triggerType === 'exact_match' && (
                      <div>
                        <Label>Keywords (comma separated)</Label>
                        <Textarea
                          value={((selectedNode.data as any).keywords || []).join(', ')}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                            })
                          }
                          placeholder="hello, hi, hey"
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.type === 'message' && (
                  <div>
                    <Label>Message Content</Label>
                    <Textarea
                      value={(selectedNode.data as any).message || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                      placeholder="Type your message here..."
                      rows={6}
                    />
                  </div>
                )}

                {selectedNode.type === 'ai' && (
                  <div>
                    <Label>Prompt</Label>
                    <Textarea
                      value={(selectedNode.data as any).prompt || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                      placeholder="Ask AI to generate a response..."
                      rows={6}
                    />
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <div>
                    <Label>Condition Logic</Label>
                    <Textarea
                      value={(selectedNode.data as any).condition || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                      placeholder="e.g., {{user_age}} > 18"
                      rows={4}
                    />
                  </div>
                )}

                {selectedNode.type === 'tag' && (
                  <div>
                    <Label>Tag Name</Label>
                    <Input
                      value={(selectedNode.data as any).tagName || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { tagName: e.target.value })}
                      placeholder="e.g., Premium Customer"
                    />
                  </div>
                )}

                {selectedNode.type === 'wait' && (
                  <div>
                    <Label>Wait Time (seconds)</Label>
                    <Input
                      type="number"
                      value={(selectedNode.data as any).waitSeconds || 60}
                      onChange={(e) => updateNodeData(selectedNode.id, { waitSeconds: parseInt(e.target.value) || 60 })}
                      min={1}
                      max={86400}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-muted/50">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => duplicateNode(selectedNode)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowBuilder;